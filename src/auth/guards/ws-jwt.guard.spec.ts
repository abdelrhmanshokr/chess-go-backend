import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { WsJwtGuard } from './ws-jwt.guard';

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockSocket = {
    handshake: {
      auth: {},
      headers: {},
      query: {},
    },
    data: {},
    id: 'test-socket-id',
  };

  const mockContext = {
    switchToWs: jest.fn().mockReturnThis(),
    getClient: jest.fn().mockReturnValue(mockSocket),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsJwtGuard,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    guard = module.get<WsJwtGuard>(WsJwtGuard);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return false if no token is provided', async () => {
      const result = await guard.canActivate(mockContext);
      expect(result).toBe(false);
    });

    it('should return false if token verification fails', async () => {
      mockSocket.handshake.auth = { token: 'invalid-token' };
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('Invalid token'));

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(false);
    });

    it('should return true and attach user to client.data if token is valid (handshake.auth)', async () => {
      const payload = { sub: '123', email: 'test@example.com' };
      mockSocket.handshake.auth = { token: 'valid-token' };
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(payload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect((mockSocket as any).data.user).toEqual(payload);
    });

    it('should extract token from Bearer header', async () => {
      const payload = { sub: '123', email: 'test@example.com' };
      mockSocket.handshake.auth = {};
      mockSocket.handshake.headers = { authorization: 'Bearer header-token' };
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(payload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('header-token', expect.any(Object));
    });

    it('should extract token from query', async () => {
      const payload = { sub: '123', email: 'test@example.com' };
      mockSocket.handshake.auth = {};
      mockSocket.handshake.headers = {};
      mockSocket.handshake.query = { token: 'query-token' };
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(payload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('query-token', expect.any(Object));
    });
  });
});
