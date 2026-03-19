import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import amqplib, {
  type Channel,
  type Connection,
  type ConsumeMessage,
} from 'amqplib';
import { env } from '../../config/env';
import { HandleNotificationEventUseCase } from '../../application/usecases/handle-notification-event.usecase';
import { AppLogger } from '../logger/app-logger.service';

@Injectable()
export class NotificationEventConsumer
  implements OnModuleInit, OnModuleDestroy
{
  private connection?: Connection;
  private channel?: Channel;
  private retryTimer?: NodeJS.Timeout;

  constructor(
    private readonly handleUseCase: HandleNotificationEventUseCase,
    private readonly logger: AppLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.tryConnectAndConsume();

    if (!this.channel) {
      // Retry until RabbitMQ becomes reachable.
      this.retryTimer = setInterval(
        () => void this.tryConnectAndConsume(),
        5000,
      );
    }
  }

  private async tryConnectAndConsume(): Promise<void> {
    try {
      this.connection = await amqplib.connect(env.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      await this.channel.assertQueue(env.rabbitmq.queueName, {
        durable: true,
      });

      await this.channel.consume(
        env.rabbitmq.queueName,
        (msg) => void this.onMessage(msg),
        { noAck: false },
      );

      // Successfully connected, stop retry timer.
      if (this.retryTimer) clearInterval(this.retryTimer);
      this.retryTimer = undefined;
    } catch (err) {
      // Keep service running; try again later.

      this.logger.warn('NotificationEventConsumer: RabbitMQ connect failed', {
        error: err instanceof Error ? err.message : err,
      });
    }
  }

  async onMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg) return;

    try {
      const raw = msg.content.toString('utf8');
      const payload = JSON.parse(raw);

      this.logger.debug('NotificationEventConsumer: received', {
        queue: env.rabbitmq.queueName,
        payloadType: payload?.type,
        actorUserId: payload?.actorUserId,
      });

      await this.handleUseCase.execute(payload);
      this.channel?.ack(msg);

      this.logger.debug('NotificationEventConsumer: acked', {
        queue: env.rabbitmq.queueName,
        payloadType: payload?.type,
      });
    } catch {
      // Drop invalid/failed messages to prevent infinite requeue.
      this.channel?.nack(msg, false, false);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.retryTimer) clearInterval(this.retryTimer);
    this.retryTimer = undefined;

    try {
      await this.channel?.close();
    } catch {
      // ignore
    }
    try {
      await this.connection?.close();
    } catch {
      // ignore
    }
  }
}
