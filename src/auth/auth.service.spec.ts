import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signToken', () => {
    it('should call jwtService.signAsync with correct payload', async () => {
      const userId = '123';
      const email = 'test@example.com';
      const result = await service.signToken(userId, email);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: userId,
        email,
      });
      expect(result).toBe('mock-token');
    });
  });
});
