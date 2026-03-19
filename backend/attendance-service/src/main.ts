import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { env } from './config/env';
import { AppLogger } from './infrastructure/logger/app-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(AppLogger);
  app.useLogger(logger);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(env.port);
  logger.debug(`Attendance-service HTTP listening on port ${env.port}`);
}

bootstrap();
