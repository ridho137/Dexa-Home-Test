import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AttendanceRepository } from '../../domain/repositories/attendance.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { EmployeeGrpcClient } from '../../infrastructure/grpc/employee-grpc.client';

@Injectable()
export class CreateAttendanceUseCase {
  constructor(
    private readonly repo: AttendanceRepository,
    private readonly logger: AppLogger,
    private readonly employeeClient: EmployeeGrpcClient,
  ) {}

  async execute(employeeId: string, status: 'IN' | 'OUT') {
    if (status !== 'IN' && status !== 'OUT') {
      this.logger.warn('CreateAttendanceUseCase: missing/invalid status', {
        employeeId,
        status,
      });
      throw new BadRequestException('INVALID_STATUS');
    }

    // Ensure employee exists and is active via employee-service (gRPC)
    try {
      const emp = await this.employeeClient.getEmployee(employeeId);
      if (!emp.found || !emp.isActive) {
        this.logger.warn(
          'CreateAttendanceUseCase: employee not found or inactive',
          { employeeId },
        );
        throw new UnauthorizedException('EMPLOYEE_NOT_ACTIVE');
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error('CreateAttendanceUseCase: employee gRPC lookup error', {
        employeeId,
        err,
      });
      throw new InternalServerErrorException('EMPLOYEE_LOOKUP_FAILED');
    }
    const now = new Date();
    const dateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let last;
    try {
      last = await this.repo.findLastForDate(employeeId, dateOnly);
    } catch (err) {
      this.logger.error('CreateAttendanceUseCase: lookup error', {
        employeeId,
        err,
      });
      throw new InternalServerErrorException('ATTENDANCE_LOOKUP_FAILED');
    }

    // Enforce simple daily rule:
    // - First record must be IN
    // - After OUT, can't create more attendance for that day
    if (!last && status === 'OUT') {
      this.logger.warn('CreateAttendanceUseCase: OUT requires previous IN', {
        employeeId,
      });
      throw new BadRequestException('ATTENDANCE_OUT_REQUIRES_IN');
    }

    if (last?.status === 'OUT') {
      this.logger.warn('CreateAttendanceUseCase: day already completed', {
        employeeId,
      });
      throw new BadRequestException('ATTENDANCE_ALREADY_COMPLETED');
    }

    if (last && last.status === status) {
      this.logger.warn(
        'CreateAttendanceUseCase: duplicate same status for today',
        {
          employeeId,
          status,
        },
      );
      throw new BadRequestException('ATTENDANCE_STATUS_CONFLICT');
    }

    try {
      const created = await this.repo.create({
        id: randomUUID(),
        employeeId,
        attendanceDate: dateOnly,
        status,
      });
      this.logger.debug('CreateAttendanceUseCase: attendance created', {
        id: created.id,
        employeeId,
        status: created.status,
      });
      return created;
    } catch (err) {
      this.logger.error('CreateAttendanceUseCase: create error', {
        employeeId,
        err,
      });
      throw new InternalServerErrorException('ATTENDANCE_CREATE_FAILED');
    }
  }
}
