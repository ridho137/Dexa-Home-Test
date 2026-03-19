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

export interface TodayAttendanceStatus {
  date: string;
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  firstInTime: Date | null;
  lastOutTime: Date | null;
  lastStatus: 'IN' | 'OUT' | null;
}

@Injectable()
export class GetTodayAttendanceStatusUseCase {
  constructor(
    private readonly repo: AttendanceRepository,
    private readonly logger: AppLogger,
    private readonly employeeClient: EmployeeGrpcClient,
  ) {}

  async execute(employeeId: string): Promise<TodayAttendanceStatus> {
    // Validate employee existence & active status via employee-service (gRPC)
    try {
      const emp = await this.employeeClient.getEmployee(employeeId);
      if (!emp.found) {
        this.logger.warn(
          'GetTodayAttendanceStatusUseCase: employee not found',
          {
            employeeId,
          },
        );
        throw new NotFoundException('EMPLOYEE_NOT_FOUND');
      }
      if (!emp.isActive) {
        this.logger.warn('GetTodayAttendanceStatusUseCase: employee inactive', {
          employeeId,
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
      this.logger.error(
        'GetTodayAttendanceStatusUseCase: employee gRPC lookup error',
        { employeeId, err },
      );
      throw new InternalServerErrorException('EMPLOYEE_LOOKUP_FAILED');
    }

    const now = new Date();
    const dateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let result: ListAttendanceResult;
    try {
      result = await this.repo.listMy({
        employeeId,
        startDate: dateOnly,
        endDate: dateOnly,
        page: 1,
        limit: 100,
      });
    } catch (err) {
      this.logger.error('GetTodayAttendanceStatusUseCase: repository error', {
        employeeId,
        err,
      });
      throw new InternalServerErrorException('ATTENDANCE_LIST_FAILED');
    }

    const records = result.data;
    const firstIn = records.find((r) => r.status === 'IN') ?? null;
    const lastOut =
      [...records].reverse().find((r) => r.status === 'OUT') ?? null;
    const last = records[0] ?? null; // ordered DESC by date & time

    return {
      date: dateOnly.toISOString().slice(0, 10),
      hasCheckedIn: !!firstIn,
      hasCheckedOut: !!lastOut,
      firstInTime: firstIn ? firstIn.attendanceTime : null,
      lastOutTime: lastOut ? lastOut.attendanceTime : null,
      lastStatus: last ? last.status : null,
    };
  }
}
