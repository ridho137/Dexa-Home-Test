import { Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository';
import { pgPool } from '../db/pg-client';

@Injectable()
export class PgUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const result = await pgPool.query(
      `
        SELECT
          id,
          email,
          password_hash,
          role,
          is_active,
          created_at,
          updated_at
        FROM auth.users
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
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await pgPool.query(
      `
        SELECT
          id,
          email,
          password_hash,
          role,
          is_active,
          created_at,
          updated_at
        FROM auth.users
        WHERE email = $1
      `,
      [email],
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(user: {
    id: string;
    email: string;
    passwordHash: string;
    role: User['role'];
  }): Promise<User> {
    const result = await pgPool.query(
      `
        INSERT INTO auth.users (id, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          email,
          password_hash,
          role,
          is_active,
          created_at,
          updated_at
      `,
      [user.id, user.email, user.passwordHash, user.role],
    );

    const row = result.rows[0];

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await pgPool.query(
      `
        UPDATE auth.users
        SET password_hash = $2,
            updated_at = now()
        WHERE id = $1
      `,
      [id, passwordHash],
    );
  }
}
