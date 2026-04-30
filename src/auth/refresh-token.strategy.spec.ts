import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenStrategy } from './refresh-token.strategy';

describe('RefreshTokenStrategy', () => {
  let strategy: RefreshTokenStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-refresh-secret'),
          },
        },
      ],
    }).compile();

    strategy = module.get<RefreshTokenStrategy>(RefreshTokenStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return payload and refresh token from request', async () => {
      const payload = { sub: '123', email: 'test@example.com', username: 'testuser' };
      const req = {
        get: jest.fn().mockReturnValue('Bearer mock-refresh-token'),
      } as any;

      const result = await strategy.validate(req, payload);

      expect(result).toEqual({
        ...payload,
        refreshToken: 'mock-refresh-token',
      });
    });
  });
});
