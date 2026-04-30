import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
              if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
              return 'test-secret';
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const dto = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
    };

    it('should throw ConflictException if user already exists', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue({ id: '1' } as any);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should create a new user and return user without password', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.user, 'create').mockResolvedValue({
        id: '1',
        email: dto.email,
        username: dto.username,
        password: 'hashedPassword',
      } as any);

      const result = await service.register(dto);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: dto.email,
          username: dto.username,
          password: expect.any(String),
        }),
      });
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe(dto.email);

      // Verify bcrypt was called (at least check if the password sent to create is not the plain one)
      const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.password).not.toBe(dto.password);
      
      const isMatch = await bcrypt.compare(dto.password, createCall.data.password);
      expect(isMatch).toBe(true);
    });
  });

  describe('login', () => {
    const dto = {
      identifier: 'test@example.com',
      password: 'password123',
    };

    it('should throw UnauthorizedException if user not found', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password incorrect', async () => {
      const hashedPassword = await bcrypt.hash('differentPassword', 10);
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        password: hashedPassword,
        elo: 1000,
      } as any);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return access token and user info on successful login with email', async () => {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        password: hashedPassword,
        elo: 1000,
      };
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);

      const result = await service.login(dto);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: dto.identifier }, { username: dto.identifier }],
        },
      });
      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock-token');
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        elo: mockUser.elo,
      });
    });

    it('should return access token and user info on successful login with username', async () => {
      const usernameDto = { identifier: 'testuser', password: 'password123' };
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        password: hashedPassword,
        elo: 1000,
      };
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);

      const result = await service.login(usernameDto);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: usernameDto.identifier }, { username: usernameDto.identifier }],
        },
      });
      expect(result.access_token).toBe('mock-token');
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        elo: mockUser.elo,
      });
    });
  });

  describe('refreshTokens', () => {
    const userId = '1';
    const refreshToken = 'valid-refresh-token';

    it('should throw ForbiddenException if user not found or no hash', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(service.refreshTokens(userId, refreshToken)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if refresh token does not match hash', async () => {
      const hashedRT = await bcrypt.hash('different-token', 10);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: userId,
        refreshTokenHash: hashedRT,
      } as any);

      await expect(service.refreshTokens(userId, refreshToken)).rejects.toThrow(ForbiddenException);
    });

    it('should return new tokens and update hash on success', async () => {
      const tokenDataToHash = createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      const hashedRT = await bcrypt.hash(tokenDataToHash, 10);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        refreshTokenHash: hashedRT,
      } as any);
      jest.spyOn(prisma.user, 'update').mockResolvedValue({} as any);

      const result = await service.refreshTokens(userId, refreshToken);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should call updateMany to clear refresh token hash', async () => {
      const userId = '1';
      jest.spyOn(prisma.user, 'updateMany').mockResolvedValue({ count: 1 } as any);

      await service.logout(userId);

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: userId,
          refreshTokenHash: { not: null },
        },
        data: {
          refreshTokenHash: null,
        },
      });
    });
  });

  describe('signToken', () => {
    it('should call jwtService.signAsync with correct payload', async () => {
      const userId = '123';
      const email = 'test@example.com';
      const username = 'testuser';
      const result = await service.signToken(userId, email, username);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: userId,
          email,
          username,
        },
        expect.any(Object),
      );
      expect(result).toBe('mock-token');
    });
  });
});
