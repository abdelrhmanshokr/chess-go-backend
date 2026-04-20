import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';

describe('RedisService', () => {
  let service: RedisService;
  let mockRedis: any;

  beforeEach(async () => {
    mockRedis = {
      on: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      publish: jest.fn().mockResolvedValue(1),
      subscribe: jest.fn().mockResolvedValue(1),
      disconnect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => {
              if (key === 'REDIS_HOST') return 'localhost';
              if (key === 'REDIS_PORT') return 6379;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);

    // Mock Redis constructor
    jest.mock('ioredis', () => {
      return jest.fn().mockImplementation(() => mockRedis);
    });

    // Manually set private clients to mock for testing operations
    (service as any).client = mockRedis;
    (service as any).subscriber = mockRedis;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('set', () => {
    it('should call client.set without TTL', async () => {
      await service.set('test-key', 'test-value');
      expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should call client.set with TTL', async () => {
      await service.set('test-key', 'test-value', 60);
      expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'test-value', 'EX', 60);
    });
  });

  describe('get', () => {
    it('should return value from client.get', async () => {
      mockRedis.get.mockResolvedValue('some-value');
      const result = await service.get('test-key');
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      expect(result).toBe('some-value');
    });
  });

  describe('del', () => {
    it('should call client.del', async () => {
      await service.del('test-key');
      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('publish', () => {
    it('should call client.publish', async () => {
      await service.publish('channel', 'message');
      expect(mockRedis.publish).toHaveBeenCalledWith('channel', 'message');
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect clients', () => {
      service.onModuleDestroy();
      expect(mockRedis.disconnect).toHaveBeenCalledTimes(2);
    });
  });

  describe('subscribe', () => {
    it('should call subscriber.subscribe and register message listener', async () => {
      const callback = jest.fn();
      const channel = 'test-channel';
      
      await service.subscribe(channel, callback);
      
      expect(mockRedis.subscribe).toHaveBeenCalledWith(channel);
      expect(mockRedis.on).toHaveBeenCalledWith('message', expect.any(Function));
      
      // Simulate message
      const messageHandler = mockRedis.on.mock.calls.find((call: any) => call[0] === 'message')[1];
      messageHandler(channel, 'test-message');
      
      expect(callback).toHaveBeenCalledWith('test-message');
    });

    it('should not call callback for different channel', async () => {
      const callback = jest.fn();
      await service.subscribe('channel-1', callback);
      
      const messageHandler = mockRedis.on.mock.calls.find((call: any) => call[0] === 'message')[1];
      messageHandler('channel-2', 'test-message');
      
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
