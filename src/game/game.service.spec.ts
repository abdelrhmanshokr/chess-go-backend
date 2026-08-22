import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { GameService } from './game.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGameDto } from './dto/create-game.dto';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('GameService', () => {
  let service: GameService;
  let prisma: PrismaService;

  const mockGame = {
    id: 'game-1',
    status: 'IN_PROGRESS',
    fen: STARTING_FEN,
    goState: null,
    whitePlayer1Id: 'white-1',
    whitePlayer2Id: 'white-2',
    blackPlayer1Id: 'black-1',
    blackPlayer2Id: 'black-2',
    timeControl: 600,
    increment: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: PrismaService,
          useValue: {
            game: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            move: {
              create: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createGame', () => {
    const dto: CreateGameDto = {
      whitePlayer1Id: 'white-1',
      whitePlayer2Id: 'white-2',
      blackPlayer1Id: 'black-1',
      blackPlayer2Id: 'black-2',
    };

    it('should create a game with default timeControl/increment and IN_PROGRESS status', async () => {
      jest.spyOn(prisma.game, 'create').mockResolvedValue(mockGame as any);

      const result = await service.createGame(dto);

      expect(prisma.game.create).toHaveBeenCalledWith({
        data: {
          whitePlayer1Id: 'white-1',
          whitePlayer2Id: 'white-2',
          blackPlayer1Id: 'black-1',
          blackPlayer2Id: 'black-2',
          timeControl: 600,
          increment: 0,
          status: 'IN_PROGRESS',
        },
      });
      expect(result).toEqual(mockGame);
    });

    it('should respect explicit timeControl/increment overrides', async () => {
      jest.spyOn(prisma.game, 'create').mockResolvedValue(mockGame as any);

      await service.createGame({ ...dto, timeControl: 300, increment: 5 });

      expect(prisma.game.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ timeControl: 300, increment: 5 }),
        }),
      );
    });
  });

  describe('validateMove', () => {
    it('should return the resulting SAN and FEN for a legal move', () => {
      const result = service.validateMove(STARTING_FEN, 'e4');

      expect(result).not.toBeNull();
      expect(result?.san).toBe('e4');
      expect(result?.fenAfter).toBe(
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      );
    });

    it('should return null for an illegal move', () => {
      // Black cannot move on White's turn from the starting position.
      const result = service.validateMove(STARTING_FEN, 'e5');

      expect(result).toBeNull();
    });

    it('should return null (not throw) for a malformed move string', () => {
      expect(() =>
        service.validateMove(STARTING_FEN, 'not-a-move'),
      ).not.toThrow();
      expect(service.validateMove(STARTING_FEN, 'not-a-move')).toBeNull();
    });
  });

  describe('makeMove', () => {
    it('should throw NotFoundException if the game does not exist', async () => {
      jest.spyOn(prisma.game, 'findUnique').mockResolvedValue(null);

      await expect(service.makeMove('ghost', 'white-1', 'e4')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if the game is not IN_PROGRESS', async () => {
      jest
        .spyOn(prisma.game, 'findUnique')
        .mockResolvedValue({ ...mockGame, status: 'FINISHED' } as any);

      await expect(service.makeMove('game-1', 'white-1', 'e4')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if the player is not part of the game', async () => {
      jest.spyOn(prisma.game, 'findUnique').mockResolvedValue(mockGame as any);

      await expect(
        service.makeMove('game-1', 'stranger', 'e4'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for an illegal move', async () => {
      jest.spyOn(prisma.game, 'findUnique').mockResolvedValue(mockGame as any);

      // e5 is illegal for White from the starting position.
      await expect(service.makeMove('game-1', 'white-1', 'e5')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should persist the move and updated FEN atomically, returning the updated game', async () => {
      jest.spyOn(prisma.game, 'findUnique').mockResolvedValue(mockGame as any);
      const expectedFenAfter =
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const updatedGame = { ...mockGame, fen: expectedFenAfter };
      jest.spyOn(prisma, '$transaction').mockResolvedValue([updatedGame]);

      const result = await service.makeMove('game-1', 'white-1', 'e4');

      expect(prisma.game.update).toHaveBeenCalledWith({
        where: { id: 'game-1' },
        data: { fen: expectedFenAfter },
      });
      expect(prisma.move.create).toHaveBeenCalledWith({
        data: {
          gameId: 'game-1',
          playerId: 'white-1',
          notation: 'e4',
          type: 'CHESS',
          fenBefore: STARTING_FEN,
          fenAfter: expectedFenAfter,
        },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(updatedGame);
    });

    it('should accept a move from any of the 4 seats, not just white-1', async () => {
      jest.spyOn(prisma.game, 'findUnique').mockResolvedValue(mockGame as any);
      jest.spyOn(prisma, '$transaction').mockResolvedValue([mockGame]);

      await expect(
        service.makeMove('game-1', 'black-2', 'e4'),
      ).resolves.toBeDefined();
    });
  });

  describe('forfeit', () => {
    it('should throw NotFoundException if the game does not exist', async () => {
      jest.spyOn(prisma.game, 'findUnique').mockResolvedValue(null);

      await expect(service.forfeit('ghost', 'white-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if the player is not part of the game', async () => {
      jest.spyOn(prisma.game, 'findUnique').mockResolvedValue(mockGame as any);

      await expect(service.forfeit('game-1', 'stranger')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should resolve with a forfeit_pending placeholder without mutating state', async () => {
      jest.spyOn(prisma.game, 'findUnique').mockResolvedValue(mockGame as any);

      const result = await service.forfeit('game-1', 'black-1');

      expect(result).toEqual({
        gameId: 'game-1',
        playerId: 'black-1',
        status: 'forfeit_pending',
      });
      expect(prisma.game.update).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
