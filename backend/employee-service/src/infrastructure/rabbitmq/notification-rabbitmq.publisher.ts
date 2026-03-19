import { Injectable } from '@nestjs/common';
import amqplib, { type Channel, type Connection } from 'amqplib';
import { env } from '../../config/env';
import { AppLogger } from '../logger/app-logger.service';

export type NotificationEventType =
  | 'EMPLOYEE_UPDATED'
  | 'EMPLOYEE_PASSWORD_CHANGED';

export type NotificationEventPayload = {
  type: NotificationEventType;
  actorUserId: string;
  actorEmail?: string;
  actorRole?: string;
  occurredAtIso: string;
  meta?: Record<string, unknown>;
};

@Injectable()
export class NotificationRabbitMqPublisher {
  private connection?: Connection;
  private channel?: Channel;

  constructor(private readonly logger: AppLogger) {}

  private async getChannel(): Promise<Channel> {
    if (this.channel) return this.channel;

    this.connection = await amqplib.connect(env.rabbitmq.url);
    this.channel = await this.connection.createChannel();

    await this.channel.assertQueue(env.rabbitmq.queueName, {
      durable: true,
    });

    return this.channel;
  }

  async publish(payload: NotificationEventPayload): Promise<void> {
    try {
      const channel = await this.getChannel();
      const body = Buffer.from(JSON.stringify(payload));

      await channel.sendToQueue(env.rabbitmq.queueName, body, {
        persistent: true,
        contentType: 'application/json',
      });
    } catch (err) {
      // Publishing must not block business logic.
      this.logger.warn('NotificationRabbitMqPublisher: publish failed', {
        error: err instanceof Error ? err.message : err,
      });
    }
  }
}
