import { Injectable } from '@nestjs/common';
import { Session } from '../../domain/entities/session.entity';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { pgPool } from '../db/pg-client';

@Injectable()
export class PgSessionRepository implements SessionRepository {
  async create(session: {
    id: string;
    userId: string;
    refreshToken: string;
  }): Promise<Session> {
    const result = await pgPool.query(
      `
        INSERT INTO auth.sessions (
          id,
          user_id,
          refresh_token,
          last_activity_at,
          last_refresh_at
        )
        VALUES ($1, $2, $3, now(), now())
        RETURNING
          id,
          user_id,
          refresh_token,
          last_activity_at,
          last_refresh_at,
          is_active,
          created_at
      `,
      [session.id, session.userId, session.refreshToken],
    );

    const row = result.rows[0];

    return {
      id: row.id,
      userId: row.user_id,
      refreshToken: row.refresh_token,
      lastActivityAt: row.last_activity_at,
      lastRefreshAt: row.last_refresh_at,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.last_activity_at ?? row.created_at,
    };
  }

  async findById(id: string): Promise<Session | null> {
    const result = await pgPool.query(
      `
        SELECT
          id,
          user_id,
          refresh_token,
          last_activity_at,
          last_refresh_at,
          is_active,
          created_at
        FROM auth.sessions
        WHERE id = $1
      `,
      [id],
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      userId: row.user_id,
      refreshToken: row.refresh_token,
      lastActivityAt: row.last_activity_at,
      lastRefreshAt: row.last_refresh_at,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.last_activity_at ?? row.created_at,
    };
  }

  async updateOnRefresh(id: string): Promise<void> {
    await pgPool.query(
      `
        UPDATE auth.sessions
        SET last_refresh_at = now(),
            last_activity_at = now()
        WHERE id = $1
      `,
      [id],
    );
  }

  async updateLastActivity(id: string): Promise<void> {
    await pgPool.query(
      `
        UPDATE auth.sessions
        SET last_activity_at = now()
        WHERE id = $1
      `,
      [id],
    );
  }

  async deactivate(id: string): Promise<void> {
    await pgPool.query(
      `
        UPDATE auth.sessions
        SET is_active = FALSE,
            last_activity_at = now()
        WHERE id = $1
      `,
      [id],
    );
  }
}
