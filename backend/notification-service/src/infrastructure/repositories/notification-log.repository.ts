import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { pgPool } from '../db/pg-client';
import { type AdminNotificationPayload } from '../../presentation/websocket/admin-notification.gateway';
import { env } from '../../config/env';
import { AppLogger } from '../logger/app-logger.service';

@Injectable()
export class NotificationLogRepository {
  private ensured = false;

  constructor(private readonly logger: AppLogger) {}

  async ensureSchemaAndTable(): Promise<void> {
    if (this.ensured) return;

    await pgPool.query(
      `CREATE SCHEMA IF NOT EXISTS notification AUTHORIZATION ${env.db.user}`,
    );

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS notification.notification_logs (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        actor_user_id TEXT,
        actor_email TEXT,
        actor_role TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at_iso TEXT NOT NULL,
        meta JSONB
      );
    `);

    await pgPool.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at
        ON notification.notification_logs (created_at DESC);
    `);

    await pgPool.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_logs_event_type
        ON notification.notification_logs (event_type);
    `);

    await pgPool.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_logs_actor_user_id
        ON notification.notification_logs (actor_user_id);
    `);

    this.ensured = true;
  }

  async insert(payload: AdminNotificationPayload): Promise<void> {
    await this.ensureSchemaAndTable();

    const id = randomUUID();
    const metaJson = payload.meta ? JSON.stringify(payload.meta) : null;
    const createdAtIso =
      payload.createdAtIso ??
      (payload as { occurredAtIso?: string }).occurredAtIso ??
      new Date().toISOString();

    try {
      await pgPool.query(
        `
        INSERT INTO notification.notification_logs
          (id, event_type, actor_user_id, actor_email, actor_role, created_at_iso, meta)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          id,
          payload.type,
          payload.actorUserId,
          payload.actorEmail ?? null,
          payload.actorRole ?? null,
          createdAtIso,
          metaJson,
        ],
      );
    } catch (err) {
      this.logger.error('NotificationLogRepository: insert failed', {
        eventType: payload.type,
        actorUserId: payload.actorUserId,
        error: err instanceof Error ? err.message : err,
      });
      throw err;
    }
  }
}
