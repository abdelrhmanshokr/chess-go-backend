import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { UserStatsDto } from './dto/user-stats.dto';

// Short TTL: leaderboard tolerates staleness, but shouldn't go too long
// without reflecting recent Elo changes from finished games.
const LEADERBOARD_CACHE_TTL_SECONDS = 30;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Finds a user by ID.
   * @param id The user's unique identifier.
   * @returns User object without sensitive data.
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        elo: true,
        gamesPlayed: true,
        wins: true,
        losses: true,
        draws: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Retrieves user statistics.
   * @param id User ID.
   */
  async getStats(id: string): Promise<UserStatsDto> {
    const user = await this.findOne(id);
    const winRate = user.gamesPlayed > 0 
      ? Math.round((user.wins / user.gamesPlayed) * 100) 
      : 0;

    return {
      id: user.id,
      username: user.username,
      elo: user.elo,
      gamesPlayed: user.gamesPlayed,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      winRate,
    };
  }

  /**
   * Retrieves the global leaderboard.
   */
  async getLeaderboard(query: LeaderboardQueryDto) {
    const { limit, offset } = query;

    // Cache key is scoped per page, since limit/offset combos are requested
    // repeatedly (e.g. everyone loading page 1) and Elo changes infrequently
    // relative to leaderboard read volume.
    const cacheKey = `leaderboard:limit=${limit}:offset=${offset}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const leaderboard = await this.prisma.user.findMany({
      orderBy: { elo: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        elo: true,
        wins: true,
        losses: true,
        draws: true,
        gamesPlayed: true,
      },
    });

    await this.redis.set(cacheKey, JSON.stringify(leaderboard), LEADERBOARD_CACHE_TTL_SECONDS);

    return leaderboard;
  }

  /**
   * Finds a user by ID.
   * @param id The user's unique identifier.
   * @returns User object without sensitive data.
   */
  async getPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        username: true,
        avatarUrl: true,
        elo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Updates a user's profile.
   * @param id The user's unique identifier.
   * @param dto Data to update.
   * @returns Updated user object.
   */
  async update(id: string, dto: UpdateUserDto) {
    // Check if username is being updated and if it's already taken
    if (dto.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Username is already taken');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        elo: true,
        updatedAt: true,
      },
    });
  }
}
