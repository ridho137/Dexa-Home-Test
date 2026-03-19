import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { env } from './config/env';
import { AppLogger } from './infrastructure/logger/app-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(AppLogger);
  app.useLogger(logger);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // gRPC server for EmployeeGrpc (used by attendance-service)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'employee',
      protoPath: join(__dirname, '..', 'src/proto/employee.proto'),
      url: `0.0.0.0:${env.grpcPort}`,
    },
  });

  await app.startAllMicroservices();
  await app.listen(env.port);
  logger.debug(`Employee-service HTTP listening on port ${env.port}`);
  logger.debug(`Employee-service gRPC listening on port ${env.grpcPort}`);
}

bootstrap();
