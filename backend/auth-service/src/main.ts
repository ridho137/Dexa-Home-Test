import 'dotenv/config';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { env } from './config/env';
import { AppLogger } from './infrastructure/logger/app-logger.service';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(AppLogger);
  app.useLogger(logger);

  // Security middlewares
  app.use(helmet());
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation & payload sanitation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // gRPC microservice for token checks
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'auth',
      // When compiled, __dirname points to "dist", so we go back to src/proto
      protoPath: join(__dirname, '..', 'src/proto/auth.proto'),
      url: `0.0.0.0:${env.grpcPort}`,
    },
  });

  await app.startAllMicroservices();
  await app.listen(env.port);

  logger.debug(`Auth-service HTTP listening on port ${env.port}`);
  logger.debug(`Auth-service gRPC listening on port ${env.grpcPort}`);
}

bootstrap();
