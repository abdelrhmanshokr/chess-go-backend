import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';

// Long-term Solution: Move mock to the top level.
// This ensures any instantiation of Redis (including during NestJS compile) 
// is intercepted before actual network handles are created.
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    publish: jest.fn().mockResolvedValue(1),
    subscribe: jest.fn().mockResolvedValue(1),
    disconnect: jest.fn().mockResolvedValue('OK'),
    quit: jest.fn().mockResolvedValue('OK'),
    connect: jest.fn().mockResolvedValue('OK'),
  }));
});

describe('RedisService', () => {
  let service: RedisService;
  let mockRedis: any;

  beforeEach(async () => {
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
            getOrThrow: jest.fn((key) => {
              if (key === 'REDIS_HOST') return 'localhost';
              if (key === 'REDIS_PORT') return 6379;
              throw new Error(`Config ${key} not found`);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    // Mandatory: Initialize the service so clients are instantiated
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('set', () => {
    it('should call client.set without TTL', async () => {
      const client = (service as any).client;
      await service.set('test-key', 'test-value');
      expect(client.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should call client.set with TTL', async () => {
      const client = (service as any).client;
      await service.set('test-key', 'test-value', 60);
      expect(client.set).toHaveBeenCalledWith('test-key', 'test-value', 'EX', 60);
    });
  });

  describe('get', () => {
    it('should return value from client.get', async () => {
      const client = (service as any).client;
      client.get.mockResolvedValue('some-value');
      const result = await service.get('test-key');
      expect(client.get).toHaveBeenCalledWith('test-key');
      expect(result).toBe('some-value');
    });
  });

  describe('del', () => {
    it('should call client.del', async () => {
      const client = (service as any).client;
      await service.del('test-key');
      expect(client.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('publish', () => {
    it('should call client.publish', async () => {
      const client = (service as any).client;
      await service.publish('channel', 'message');
      expect(client.publish).toHaveBeenCalledWith('channel', 'message');
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect clients', () => {
      const client = (service as any).client;
      const subscriber = (service as any).subscriber;
      service.onModuleDestroy();
      expect(client.disconnect).toHaveBeenCalled();
      expect(subscriber.disconnect).toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should call subscriber.subscribe and register message listener', async () => {
      const subscriber = (service as any).subscriber;
      const callback = jest.fn();
      const channel = 'test-channel';
      
      await service.subscribe(channel, callback);
      
      expect(subscriber.subscribe).toHaveBeenCalledWith(channel);
      expect(subscriber.on).toHaveBeenCalledWith('message', expect.any(Function));
      
      // Simulate message
      const messageHandler = subscriber.on.mock.calls.find((call: any) => call[0] === 'message')[1];
      messageHandler(channel, 'test-message');
      
      expect(callback).toHaveBeenCalledWith('test-message');
    });

    it('should not call callback for different channel', async () => {
      const subscriber = (service as any).subscriber;
      const callback = jest.fn();
      await service.subscribe('channel-1', callback);
      
      const messageHandler = subscriber.on.mock.calls.find((call: any) => call[0] === 'message')[1];
      messageHandler('channel-2', 'test-message');
      
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
