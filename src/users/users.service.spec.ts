import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    avatarUrl: 'http://avatar.com',
    elo: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return user info without sensitive data', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.findOne('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
          elo: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = { username: 'newname' };

    it('should throw ConflictException if username is taken by another user', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'other-id' } as any);

      await expect(service.update('user-1', updateDto)).rejects.toThrow(ConflictException);
    });

    it('should allow updating if username is taken by the same user', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'user-1' } as any);
      jest.spyOn(prisma.user, 'update').mockResolvedValue({ ...mockUser, ...updateDto } as any);

      const result = await service.update('user-1', updateDto);
      expect(result.username).toBe('newname');
    });

    it('should update and return user without sensitive data', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null); // No conflict
      jest.spyOn(prisma.user, 'update').mockResolvedValue({ ...mockUser, ...updateDto } as any);

      const result = await service.update('user-1', updateDto);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: updateDto,
        select: expect.objectContaining({
          id: true,
          username: true,
        }),
      });
      expect(result.username).toBe('newname');
    });
  });
});
