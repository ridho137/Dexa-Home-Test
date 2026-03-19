import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from './config/env';
import { AppLogger } from './infrastructure/logger/app-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(AppLogger);
  app.useLogger(logger);

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'authorization',
      'content-type',
      'x-api-key',
      'x-user-credentials',
      'x-gateway-signature',
    ],
  });

  await app.listen(env.port);
  logger.debug(`Gateway is listening on port ${env.port}`);
}

bootstrap();
