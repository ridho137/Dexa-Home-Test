import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { env } from './config/env';
import { AppLogger } from './infrastructure/logger/app-logger.service';
import { AdminNotificationGateway } from './presentation/websocket/admin-notification.gateway';
import { NotificationLogRepository } from './infrastructure/repositories/notification-log.repository';
import { HandleNotificationEventUseCase } from './application/usecases/handle-notification-event.usecase';
import { NotificationEventConsumer } from './infrastructure/rabbitmq/notification-event.consumer';

@Module({
  imports: [JwtModule.register({ secret: env.jwt.secret })],
  providers: [
    AppLogger,
    AdminNotificationGateway,
    NotificationLogRepository,
    HandleNotificationEventUseCase,
    NotificationEventConsumer,
  ],
})
export class AppModule {}
