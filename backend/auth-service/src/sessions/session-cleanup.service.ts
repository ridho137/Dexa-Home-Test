import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { pgPool } from '../infrastructure/db/pg-client';
import { AppLogger } from '../infrastructure/logger/app-logger.service';

@Injectable()
export class SessionCleanupService {
  constructor(private readonly logger: AppLogger) {}

  // Run every day at 00:00 server time
  @Cron('0 0 * * *')
  async deactivateStaleSessions() {
    try {
      const res = await pgPool.query(
        `
          UPDATE auth.sessions
          SET is_active = FALSE,
              updated_at = now()
          WHERE is_active = TRUE
            AND (
              last_activity_at IS NULL
              OR last_activity_at < now() - INTERVAL '3 days'
            )
        `,
      );

      this.logger.debug(
        `SessionCleanupService: deactivated ${res.rowCount} stale sessions`,
      );
    } catch (err) {
      this.logger.error('SessionCleanupService failed', err);
    }
  }

  // Run every day at 00:00 server time (separate policy: session age > 3 months)
  @Cron('0 0 * * *')
  async deactivateExpiredSessionsOverThreeMonths() {
    try {
      const res = await pgPool.query(
        `
          UPDATE auth.sessions
          SET is_active = FALSE,
              updated_at = now()
          WHERE is_active = TRUE
            AND created_at < now() - INTERVAL '3 months'
        `,
      );

      this.logger.debug(
        `SessionCleanupService: deactivated ${res.rowCount} sessions older than 3 months`,
      );
    } catch (err) {
      this.logger.error(
        'SessionCleanupService: deactivateExpiredSessionsOverThreeMonths failed',
        err,
      );
    }
  }
}
