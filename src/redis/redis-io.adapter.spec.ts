import { RedisIoAdapter } from './redis-io.adapter';
import { RedisService } from './redis.service';

describe('RedisIoAdapter', () => {
  let adapter: RedisIoAdapter;
  let mockRedisService: any;
  let mockApp: any;
  let mockRedisClient: any;

  beforeEach(() => {
    mockRedisClient = {
      on: jest.fn(),
      duplicate: jest.fn(),
    };

    mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
      getSubscriber: jest.fn().mockReturnValue(mockRedisClient),
    };

    mockApp = {
      get: jest.fn(),
    };

    adapter = new RedisIoAdapter(mockApp, mockRedisService as RedisService);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('connectToRedis', () => {
    it('should call redisService.getClient and getSubscriber', async () => {
      await adapter.connectToRedis();
      expect(mockRedisService.getClient).toHaveBeenCalled();
      expect(mockRedisService.getSubscriber).toHaveBeenCalled();
    });
  });
});
