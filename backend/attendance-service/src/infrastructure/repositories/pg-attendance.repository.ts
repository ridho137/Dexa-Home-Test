import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { pgPool } from '../db/pg-client';
import {
  AttendanceRepository,
  ListAllAttendanceFilters,
  ListAttendanceResult,
  ListMyAttendanceFilters,
} from '../../domain/repositories/attendance.repository';
import { Attendance } from '../../domain/entities/attendance.entity';

@Injectable()
export class PgAttendanceRepository extends AttendanceRepository {
  async create(payload: {
    id: string;
    employeeId: string;
    attendanceDate: Date;
    status: 'IN' | 'OUT';
  }): Promise<Attendance> {
    const res = await pgPool.query(
      `INSERT INTO attendance.attendances
        (id, employee_id, attendance_date, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, employee_id, attendance_date, attendance_time, status, created_at`,
      [payload.id, payload.employeeId, payload.attendanceDate, payload.status],
    );
    return this.mapRow(res.rows[0]);
  }

  async findLastForDate(
    employeeId: string,
    date: Date,
  ): Promise<Attendance | null> {
    const res = await pgPool.query(
      `SELECT id, employee_id, attendance_date, attendance_time, status, created_at
       FROM attendance.attendances
       WHERE employee_id = $1 AND attendance_date = $2
       ORDER BY attendance_time DESC
       LIMIT 1`,
      [employeeId, date],
    );
    if (res.rowCount === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async listMy(
    filters: ListMyAttendanceFilters,
  ): Promise<ListAttendanceResult> {
    const { employeeId, startDate, endDate, page, limit } = filters;
    const offset = (page - 1) * limit;

    const resCount = await pgPool.query(
      `SELECT COUNT(*)::int AS total
       FROM attendance.attendances
       WHERE employee_id = $1
         AND ($2::date IS NULL OR attendance_date >= $2)
         AND ($3::date IS NULL OR attendance_date <= $3)`,
      [employeeId, startDate ?? null, endDate ?? null],
    );
    const total = Number(resCount.rows[0]?.total ?? 0);

    const resData = await pgPool.query(
      `SELECT id, employee_id, attendance_date, attendance_time, status, created_at
       FROM attendance.attendances
       WHERE employee_id = $1
         AND ($2::date IS NULL OR attendance_date >= $2)
         AND ($3::date IS NULL OR attendance_date <= $3)
       ORDER BY attendance_date DESC, attendance_time DESC
       LIMIT $4 OFFSET $5`,
      [employeeId, startDate ?? null, endDate ?? null, limit, offset],
    );

    const data = resData.rows.map((row) => this.mapRow(row));
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
    return { data, total, page, limit, totalPages };
  }

  async listAll(
    filters: ListAllAttendanceFilters,
  ): Promise<ListAttendanceResult> {
    const { employeeId, startDate, endDate, page, limit } = filters;
    const offset = (page - 1) * limit;

    const resCount = await pgPool.query(
      `SELECT COUNT(*)::int AS total
       FROM attendance.attendances
       WHERE ($1::text IS NULL OR employee_id = $1)
         AND ($2::date IS NULL OR attendance_date >= $2)
         AND ($3::date IS NULL OR attendance_date <= $3)`,
      [employeeId ?? null, startDate ?? null, endDate ?? null],
    );
    const total = Number(resCount.rows[0]?.total ?? 0);

    const resData = await pgPool.query(
      `SELECT id, employee_id, attendance_date, attendance_time, status, created_at
       FROM attendance.attendances
       WHERE ($1::text IS NULL OR employee_id = $1)
         AND ($2::date IS NULL OR attendance_date >= $2)
         AND ($3::date IS NULL OR attendance_date <= $3)
       ORDER BY attendance_date DESC, attendance_time DESC
       LIMIT $4 OFFSET $5`,
      [employeeId ?? null, startDate ?? null, endDate ?? null, limit, offset],
    );

    const data = resData.rows.map((row) => this.mapRow(row));
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
    return { data, total, page, limit, totalPages };
  }

  async autoClockOutMissingForDate(date: Date): Promise<number> {
    const openRows = await pgPool.query<{ employee_id: string }>(
      `
        WITH last_status AS (
          SELECT DISTINCT ON (employee_id)
            employee_id,
            status
          FROM attendance.attendances
          WHERE attendance_date = $1::date
          ORDER BY employee_id, attendance_time DESC
        )
        SELECT employee_id
        FROM last_status
        WHERE status = 'IN'
      `,
      [date],
    );

    if (openRows.rowCount === 0) return 0;

    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');

      let inserted = 0;
      for (const row of openRows.rows) {
        const res = await client.query(
          `
            INSERT INTO attendance.attendances (
              id,
              employee_id,
              attendance_date,
              attendance_time,
              status
            )
            VALUES ($1, $2, $3::date, ($3::date + INTERVAL '23 hours 59 minutes 59 seconds'), 'OUT')
          `,
          [randomUUID(), row.employee_id, date],
        );
        inserted += res.rowCount ?? 0;
      }

      await client.query('COMMIT');
      return inserted;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private mapRow(row: any): Attendance {
    return {
      id: row.id,
      employeeId: row.employee_id,
      attendanceDate: row.attendance_date,
      attendanceTime: row.attendance_time,
      status: row.status,
      createdAt: row.created_at,
    };
  }
}
