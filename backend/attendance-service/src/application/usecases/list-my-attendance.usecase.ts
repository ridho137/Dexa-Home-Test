import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AttendanceRepository,
  ListAttendanceResult,
} from '../../domain/repositories/attendance.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { EmployeeGrpcClient } from '../../infrastructure/grpc/employee-grpc.client';

export type AttendanceDayReport = {
  date: string; // YYYY-MM-DD
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  firstInTime: string | null; // ISO string
  lastOutTime: string | null; // ISO string
  lastStatus: 'IN' | 'OUT' | null;
  totalWorkHours: number; // number of hours for that day
};

export type ListMyAttendanceGroupedResult = Omit<
  ListAttendanceResult,
  'data'
> & { data: AttendanceDayReport[] };

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
export class ListMyAttendanceUseCase {
  constructor(
    private readonly repo: AttendanceRepository,
    private readonly logger: AppLogger,
    private readonly employeeClient: EmployeeGrpcClient,
  ) {}

  async execute(params: {
    employeeId: string;
    startDate?: Date | null;
    endDate?: Date | null;
    page: number;
    limit: number;
  }): Promise<ListMyAttendanceGroupedResult> {
    // Validate employee existence & active status via employee-service (gRPC)
    try {
      const emp = await this.employeeClient.getEmployee(params.employeeId);
      if (!emp.found) {
        this.logger.warn('ListMyAttendanceUseCase: employee not found', {
          employeeId: params.employeeId,
        });
        throw new NotFoundException('EMPLOYEE_NOT_FOUND');
      }
      if (!emp.isActive) {
        this.logger.warn('ListMyAttendanceUseCase: employee inactive', {
          employeeId: params.employeeId,
        });
        throw new UnauthorizedException('EMPLOYEE_NOT_ACTIVE');
      }
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof UnauthorizedException
      ) {
        throw err;
      }
      this.logger.error('ListMyAttendanceUseCase: employee gRPC lookup error', {
        employeeId: params.employeeId,
        err,
      });
      throw new InternalServerErrorException('EMPLOYEE_LOOKUP_FAILED');
    }

    try {
      const result = await this.repo.listMy({
        employeeId: params.employeeId,
        startDate: params.startDate ?? null,
        endDate: params.endDate ?? null,
        page: params.page,
        limit: params.limit,
      });

      // Group by attendance_date to reduce payload noise for FE.
      // Note: grouping happens after pagination (by record) to keep SQL simple.
      const groups = new Map<string, any[]>();
      for (const record of result.data) {
        const dateKey = toYMDDateKey(record.attendanceDate);
        const list = groups.get(dateKey) ?? [];
        list.push(record);
        groups.set(dateKey, list);
      }

      const dayReports: AttendanceDayReport[] = [];
      for (const [dateKey, records] of groups.entries()) {
        // Sort records within day by time ASC
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

        // Compute total work time by pairing IN -> OUT in chronological order.
        // If there are multiple cycles, we sum all completed (IN, OUT) pairs.
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

        const totalWorkHours = Math.max(0, totalMs / (1000 * 60 * 60));

        dayReports.push({
          date: dateKey,
          hasCheckedIn: !!firstIn,
          hasCheckedOut: !!lastOut,
          firstInTime: firstIn ? firstIn.attendanceTime.toISOString() : null,
          lastOutTime: lastOut ? lastOut.attendanceTime.toISOString() : null,
          lastStatus: lastRecord ? lastRecord.status : null,
          totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        });
      }

      this.logger.debug('ListMyAttendanceUseCase: listed attendances grouped', {
        employeeId: params.employeeId,
        total: result.total,
        page: result.page,
        limit: result.limit,
        groupCount: dayReports.length,
      });

      return {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        data: dayReports,
      };
    } catch (err) {
      this.logger.error('ListMyAttendanceUseCase: repository error', {
        employeeId: params.employeeId,
        err,
      });
      throw new InternalServerErrorException('ATTENDANCE_LIST_FAILED');
    }
  }
}
