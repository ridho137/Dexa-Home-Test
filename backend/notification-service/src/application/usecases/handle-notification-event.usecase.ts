import { Injectable } from '@nestjs/common';
import type { AdminNotificationPayload } from '../../presentation/websocket/admin-notification.gateway';
import { NotificationLogRepository } from '../../infrastructure/repositories/notification-log.repository';
import { AdminNotificationGateway } from '../../presentation/websocket/admin-notification.gateway';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

@Injectable()
export class HandleNotificationEventUseCase {
  constructor(
    private readonly repo: NotificationLogRepository,
    private readonly gateway: AdminNotificationGateway,
    private readonly logger: AppLogger,
  ) {}

  async execute(payload: AdminNotificationPayload): Promise<void> {
    this.logger.debug('HandleNotificationEventUseCase: inserting log', {
      payloadType: payload.type,
      actorUserId: payload.actorUserId,
    });

    await this.repo.insert(payload);

    this.gateway.broadcastToAdmins(payload);

    this.logger.debug('HandleNotificationEventUseCase: broadcasted', {
      payloadType: payload.type,
      actorUserId: payload.actorUserId,
    });
  }
}
