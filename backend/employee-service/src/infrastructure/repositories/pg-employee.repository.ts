import { Injectable } from '@nestjs/common';
import {
  EmployeeRepository,
  ListEmployeesFilters,
  ListEmployeesResult,
} from '../../domain/repositories/employee.repository';
import { Employee } from '../../domain/entities/employee.entity';
import { pgPool } from '../db/pg-client';

@Injectable()
export class PgEmployeeRepository extends EmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    const res = await pgPool.query(
      'SELECT id, name, email, position, role, phone_number, photo_url, is_active, created_at, updated_at FROM employee.employees WHERE id = $1',
      [id],
    );
    if (res.rowCount === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const res = await pgPool.query(
      'SELECT id, name, email, position, role, phone_number, photo_url, is_active, created_at, updated_at FROM employee.employees WHERE email = $1',
      [email],
    );
    if (res.rowCount === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async create(payload: {
    id: string;
    name: string;
    email: string;
    position: string;
    role?: 'EMPLOYEE' | 'ADMIN_HR';
    phoneNumber?: string | null;
    photoUrl?: string | null;
  }): Promise<Employee> {
    const role = payload.role ?? 'EMPLOYEE';
    const res = await pgPool.query(
      `INSERT INTO employee.employees
        (id, name, email, position, role, phone_number, photo_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       RETURNING id, name, email, position, role, phone_number, photo_url, is_active, created_at, updated_at`,
      [
        payload.id,
        payload.name,
        payload.email,
        payload.position,
        role,
        payload.phoneNumber ?? null,
        payload.photoUrl ?? null,
      ],
    );
    return this.mapRow(res.rows[0]);
  }

  async updateProfile(
    id: string,
    payload: { phoneNumber?: string | null; photoUrl?: string | null },
  ): Promise<Employee> {
    const res = await pgPool.query(
      `UPDATE employee.employees
       SET phone_number = COALESCE($2, phone_number),
           photo_url = COALESCE($3, photo_url),
           updated_at = now()
       WHERE id = $1
       RETURNING id, name, email, position, role, phone_number, photo_url, is_active, created_at, updated_at`,
      [id, payload.phoneNumber ?? null, payload.photoUrl ?? null],
    );
    if (res.rowCount === 0) {
      throw new Error('EMPLOYEE_NOT_FOUND');
    }
    return this.mapRow(res.rows[0]);
  }

  async adminUpdate(
    id: string,
    payload: {
      name?: string;
      position?: string;
      phoneNumber?: string | null;
    },
  ): Promise<Employee> {
    const res = await pgPool.query(
      `UPDATE employee.employees
       SET name = COALESCE($2, name),
           position = COALESCE($3, position),
           phone_number = COALESCE($4, phone_number),
           updated_at = now()
       WHERE id = $1
       RETURNING id, name, email, position, role, phone_number, photo_url, is_active, created_at, updated_at`,
      [
        id,
        payload.name ?? null,
        payload.position ?? null,
        payload.phoneNumber ?? null,
      ],
    );
    if (res.rowCount === 0) {
      throw new Error('EMPLOYEE_NOT_FOUND');
    }
    return this.mapRow(res.rows[0]);
  }

  async findAll(): Promise<Employee[]> {
    const res = await pgPool.query(
      'SELECT id, name, email, position, role, phone_number, photo_url, is_active, created_at, updated_at FROM employee.employees ORDER BY name ASC',
    );
    return res.rows.map((row) => this.mapRow(row));
  }

  async findWithFilters(
    filters: ListEmployeesFilters,
  ): Promise<ListEmployeesResult> {
    const { page, limit, role, search } = filters;
    const offset = (page - 1) * limit;
    const searchTerm =
      typeof search === 'string' && search.trim() ? search.trim() : null;
    const roleFilter = role ?? null;

    const countRes = await pgPool.query(
      `SELECT COUNT(*)::int AS total
       FROM employee.employees
       WHERE ($1::text IS NULL OR role = $1)
         AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%' OR email ILIKE '%' || $2 || '%')`,
      [roleFilter, searchTerm],
    );
    const total = Number(countRes.rows[0]?.total ?? 0);

    const dataRes = await pgPool.query(
      `SELECT id, name, email, position, role, phone_number, photo_url, is_active, created_at, updated_at
       FROM employee.employees
       WHERE ($1::text IS NULL OR role = $1)
         AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%' OR email ILIKE '%' || $2 || '%')
       ORDER BY name ASC
       LIMIT $3 OFFSET $4`,
      [roleFilter, searchTerm, limit, offset],
    );
    const data = dataRes.rows.map((row) => this.mapRow(row));
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

    return { data, total, page, limit, totalPages };
  }

  private mapRow(row: any): Employee {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      position: row.position,
      role: row.role ?? 'EMPLOYEE',
      phoneNumber: row.phone_number,
      photoUrl: row.photo_url,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
