import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  AttendanceRepository,
  ListAllAttendanceFilters,
  ListAttendanceResult,
} from '../../domain/repositories/attendance.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { EmployeeGrpcClient } from '../../infrastructure/grpc/employee-grpc.client';

export type AttendanceAdminRow = {
  date: string; // YYYY-MM-DD
  employeeId: string;
  employeeName: string | null;
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  firstInTime: string | null; // ISO
  lastOutTime: string | null; // ISO
  lastStatus: 'IN' | 'OUT' | null;
  totalWorkHours: number;
};

export type ListAdminAttendanceResult = Omit<ListAttendanceResult, 'data'> & {
  data: AttendanceAdminRow[];
};

function toYMDDateKey(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value);
}

@Injectable()
export class ListAdminAttendanceUseCase {
  constructor(
    private readonly repo: AttendanceRepository,
    private readonly logger: AppLogger,
    private readonly employeeClient: EmployeeGrpcClient,
  ) {}

  async execute(params: {
    startDate?: Date | null;
    endDate?: Date | null;
    employeeId?: string | null;
    page: number;
    limit: number;
  }): Promise<ListAdminAttendanceResult> {
    const filters: ListAllAttendanceFilters = {
      employeeId: params.employeeId ?? null,
      startDate: params.startDate ?? null,
      endDate: params.endDate ?? null,
      page: params.page,
      limit: params.limit,
    };

    let result: ListAttendanceResult;
    try {
      result = await this.repo.listAll(filters);
    } catch (err) {
      this.logger.error('ListAdminAttendanceUseCase: repository error', {
        err,
        employeeId: params.employeeId,
      });
      throw new InternalServerErrorException('ATTENDANCE_LIST_FAILED');
    }

    // Group by date + employeeId
    // Key format: `${dateKey}|${employeeId}`
    const groupMap = new Map<
      string,
      { dateKey: string; employeeId: string; records: any[] }
    >();
    for (const record of result.data) {
      const dateKey = toYMDDateKey(record.attendanceDate);
      const key = `${dateKey}|${record.employeeId}`;
      const existing = groupMap.get(key);
      if (existing) {
        existing.records.push(record);
      } else {
        groupMap.set(key, {
          dateKey,
          employeeId: record.employeeId,
          records: [record],
        });
      }
    }

    // Cache employee names to reduce gRPC calls
    const employeeNameCache = new Map<string, string | null>();

    const rows: AttendanceAdminRow[] = [];
    // Preserve insertion order based on result.data ordering (attendance_date DESC)
    for (const [, group] of groupMap.entries()) {
      const records = group.records;
      // Sort by time ASC for computing pairing
      const sorted = [...records].sort(
        (a, b) => a.attendanceTime.getTime() - b.attendanceTime.getTime(),
      );

      const firstIn = sorted.find((r) => r.status === 'IN') ?? null;
      const lastOut =
        [...sorted].reverse().find((r) => r.status === 'OUT') ?? null;

      const lastRecord =
        [...sorted].sort(
          (a, b) => b.attendanceTime.getTime() - a.attendanceTime.getTime(),
        )[0] ?? null;

      // Compute total work hours by pairing IN -> OUT (chronological)
      let openIn: any = null;
      let totalMs = 0;
      for (const r of sorted) {
        if (r.status === 'IN') {
          if (!openIn) openIn = r.attendanceTime;
          continue;
        }
        if (r.status === 'OUT') {
          if (openIn) {
            totalMs += r.attendanceTime.getTime() - openIn.getTime();
            openIn = null;
          }
        }
      }
      const totalWorkHours =
        Math.round(Math.max(0, totalMs / (1000 * 60 * 60)) * 100) / 100;

      let employeeName = employeeNameCache.get(group.employeeId) ?? null;
      if (!employeeNameCache.has(group.employeeId)) {
        try {
          const emp = await this.employeeClient.getEmployee(group.employeeId);
          if (!emp.found) {
            employeeName = null;
          } else if (!emp.isActive) {
            // still show name if inactive? here we allow null to indicate non-existent.
            employeeName = emp.name ?? null;
          } else {
            employeeName = emp.name ?? null;
          }
        } catch (err) {
          this.logger.warn('ListAdminAttendanceUseCase: employee gRPC error', {
            employeeId: group.employeeId,
            err,
          });
          employeeName = null;
        }
        employeeNameCache.set(group.employeeId, employeeName);
      }

      rows.push({
        date: group.dateKey,
        employeeId: group.employeeId,
        employeeName,
        hasCheckedIn: !!firstIn,
        hasCheckedOut: !!lastOut,
        firstInTime: firstIn ? firstIn.attendanceTime.toISOString() : null,
        lastOutTime: lastOut ? lastOut.attendanceTime.toISOString() : null,
        lastStatus: lastRecord ? lastRecord.status : null,
        totalWorkHours,
      });
    }

    this.logger.debug('ListAdminAttendanceUseCase: grouped rows ready', {
      total: result.total,
      page: result.page,
      limit: result.limit,
      rowCount: rows.length,
    });

    return {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      data: rows,
    };
  }
}
