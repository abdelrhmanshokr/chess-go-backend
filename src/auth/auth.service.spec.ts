import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

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
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
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
      } as any);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return access token on successful login with email', async () => {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        password: hashedPassword,
      } as any);

      const result = await service.login(dto);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: dto.identifier }, { username: dto.identifier }],
        },
      });
      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock-token');
    });

    it('should return access token on successful login with username', async () => {
      const usernameDto = { identifier: 'testuser', password: 'password123' };
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        password: hashedPassword,
      } as any);

      const result = await service.login(usernameDto);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: usernameDto.identifier }, { username: usernameDto.identifier }],
        },
      });
      expect(result.access_token).toBe('mock-token');
    });
  });

  describe('signToken', () => {
    it('should call jwtService.signAsync with correct payload', async () => {
      const userId = '123';
      const email = 'test@example.com';
      const username = 'testuser';
      const result = await service.signToken(userId, email, username);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: userId,
        email,
        username,
      });
      expect(result).toBe('mock-token');
    });
  });
});
