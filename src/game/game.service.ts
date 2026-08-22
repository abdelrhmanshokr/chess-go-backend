import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Chess } from 'chess.js';
import { GameStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGameDto } from './dto/create-game.dto';

interface MoveResult {
  san: string;
  fenAfter: string;
}

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new 2v2 game row. Board starts at the standard chess FEN
   * (schema default); goState is left null until the hybrid Go phase lands.
   */
  async createGame(dto: CreateGameDto) {
    const playerIds = [
      dto.whitePlayer1Id,
      dto.whitePlayer2Id,
      dto.blackPlayer1Id,
      dto.blackPlayer2Id,
    ];

    // 2v2 requires 4 distinct players — without this a seat collision
    // (e.g. whitePlayer1Id === blackPlayer1Id) would silently persist.
    if (new Set(playerIds).size !== playerIds.length) {
      throw new BadRequestException('All 4 players in a game must be distinct');
    }

    const existingPlayers = await this.prisma.user.findMany({
      where: { id: { in: playerIds } },
      select: { id: true },
    });
    if (existingPlayers.length !== playerIds.length) {
      throw new BadRequestException(
        'One or more player IDs do not correspond to an existing user',
      );
    }

    return this.prisma.game.create({
      data: {
        whitePlayer1Id: dto.whitePlayer1Id,
        whitePlayer2Id: dto.whitePlayer2Id,
        blackPlayer1Id: dto.blackPlayer1Id,
        blackPlayer2Id: dto.blackPlayer2Id,
        timeControl: dto.timeControl ?? 600,
        increment: dto.increment ?? 0,
        status: GameStatus.IN_PROGRESS,
      },
    });
  }

  /**
   * Server-side move legality check via chess.js — the single source of
   * truth, never the client. Only checks chess rules (piece movement, whose
   * color's turn it is per the FEN); it does NOT enforce the 2v2 player
   * rotation across teammates — that lands in P3-T2/P3-T3.
   */
  validateMove(fen: string, move: string): MoveResult | null {
    try {
      const chess = new Chess(fen);
      const result = chess.move(move);
      if (!result) {
        return null;
      }
      return { san: result.san, fenAfter: chess.fen() };
    } catch {
      // chess.js v1.x throws on an invalid FEN or a malformed/illegal SAN
      // rather than returning null — normalize both to null for callers.
      return null;
    }
  }

  /**
   * Applies a move: validates legality, then atomically updates the game's
   * board state and logs the move. Turn-order and win/loss detection are
   * deferred to sibling Phase 3 tasks — this only guards that the game is
   * active and the mover is one of its 4 players.
   */
  async makeMove(gameId: string, playerId: string, move: string) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });

    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }

    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Game is not in progress (status: ${game.status})`,
      );
    }

    const playerIds = [
      game.whitePlayer1Id,
      game.whitePlayer2Id,
      game.blackPlayer1Id,
      game.blackPlayer2Id,
    ];
    if (!playerIds.includes(playerId)) {
      throw new ForbiddenException('Player is not part of this game');
    }

    const fenBefore = game.fen;
    const result = this.validateMove(fenBefore, move);

    if (!result) {
      throw new BadRequestException(`Illegal move: ${move}`);
    }

    const [updatedGame] = await this.prisma.$transaction([
      this.prisma.game.update({
        where: { id: gameId },
        data: { fen: result.fenAfter },
      }),
      this.prisma.move.create({
        data: {
          gameId,
          playerId,
          notation: result.san,
          type: 'CHESS',
          fenBefore,
          fenAfter: result.fenAfter,
        },
      }),
    ]);

    return updatedGame;
  }

  /**
   * Forfeit stub (scope boundary for this task). Validates that the game and
   * player exist so callers get a clear error on bad input, but the actual
   * resignation flow — ending the game, crediting the opposing team, Elo
   * updates — is deferred to Phase 3 win/loss detection (P3-T4) and the
   * Phase 9 draw/resign work.
   */
  async forfeit(gameId: string, playerId: string) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });

    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }

    const playerIds = [
      game.whitePlayer1Id,
      game.whitePlayer2Id,
      game.blackPlayer1Id,
      game.blackPlayer2Id,
    ];
    if (!playerIds.includes(playerId)) {
      throw new ForbiddenException('Player is not part of this game');
    }

    return { gameId, playerId, status: 'forfeit_pending' as const };
  }
}
