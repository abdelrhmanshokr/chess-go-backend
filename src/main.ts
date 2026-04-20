import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './redis/redis-io.adapter';
import { RedisService } from './redis/redis.service';

async function bootstrap() {
  require('dotenv').config();
  const app = await NestFactory.create(AppModule);

  const redisService = app.get(RedisService);
  const redisIoAdapter = new RedisIoAdapter(app, redisService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
