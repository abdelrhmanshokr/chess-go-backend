import { Test, TestingModule } from '@nestjs/testing';
import { RedisModule } from './redis.module';
import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';

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
