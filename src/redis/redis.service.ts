import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private subscriber!: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.client = new Redis({
      host,
      port,
    });

    this.subscriber = new Redis({
      host,
      port,
    });

    this.client.on('connect', () => {
      this.logger.log(`Redis connected to ${host}:${port}`);
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis Client error', err);
    });

    this.subscriber.on('connect', () => {
      this.logger.log(`Redis Subscriber connected to ${host}:${port}`);
    });

    this.subscriber.on('error', (err) => {
      this.logger.error('Redis Subscriber error', err);
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
    this.subscriber.disconnect();
  }

  // Common operations
  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string) {
    await this.client.del(key);
  }

  // Pub/Sub
  async publish(channel: string, message: string) {
    await this.client.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void) {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (chan, msg) => {
      if (chan === channel) {
        callback(msg);
      }
    });
  }

  getClient(): Redis {
    return this.client;
  }
}
