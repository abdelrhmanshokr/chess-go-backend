"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const redis_io_adapter_1 = require("./redis/redis-io.adapter");
const redis_service_1 = require("./redis/redis.service");
async function bootstrap() {
    require('dotenv').config();
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const redisService = app.get(redis_service_1.RedisService);
    const redisIoAdapter = new redis_io_adapter_1.RedisIoAdapter(app, redisService);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
    app.enableShutdownHooks();
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
//# sourceMappingURL=main.js.map