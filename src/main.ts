import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './redis/redis-io.adapter';
import { RedisService } from './redis/redis.service';

async function bootstrap() {
  require('dotenv').config();
  const app = await NestFactory.create(AppModule);

  /**
   * Global Validation Pipe.
   * Enables DTO-based validation across all endpoints using class-validator.
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties that do not have any decorators
      forbidNonWhitelisted: true, // throw an error if non-whitelisted properties are present
      transform: true, // automatically transform payloads to be objects typed according to their DTO classes
    }),
  );

  const redisService = app.get(RedisService);
  // Ensure Redis infrastructure is initialized before attaching the WebSocket adapter.
  // This prevents race conditions where the adapter tries to use uninitialized clients.
  await redisService.onModuleInit();

  const redisIoAdapter = new RedisIoAdapter(app, redisService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
