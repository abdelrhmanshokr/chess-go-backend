import { Test, TestingModule } from '@nestjs/testing';
import { RedisModule } from './redis.module';
import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    disconnect: jest.fn().mockResolvedValue('OK'),
  }));
});

describe('RedisModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [RedisModule],
    })
    .overrideProvider(ConfigService)
    .useValue({
      get: jest.fn((key, defaultValue) => {
        if (key === 'REDIS_HOST') return 'localhost';
        if (key === 'REDIS_PORT') return 6379;
        return defaultValue;
      }),
      getOrThrow: jest.fn((key) => {
        if (key === 'REDIS_HOST') return 'localhost';
        if (key === 'REDIS_PORT') return 6379;
        throw new Error(`Config ${key} not found`);
      }),
    })
    .compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide RedisService', () => {
    const service = module.get<RedisService>(RedisService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(RedisService);
  });
});
