import {
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ListMyAttendanceUseCase } from './list-my-attendance.usecase';
import type { Attendance } from '../../domain/entities/attendance.entity';
import { AttendanceRepository } from '../../domain/repositories/attendance.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { EmployeeGrpcClient } from '../../infrastructure/grpc/employee-grpc.client';
import type { AttendanceStatus } from '../../domain/entities/attendance.entity';

class FakeAttendanceRepository extends AttendanceRepository {
  create(): Promise<any> {
    throw new Error('not used');
  }

  findLastForDate(): Promise<any> {
    throw new Error('not used');
  }

  listMy = jest.fn<
    Promise<{
      data: Attendance[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>,
    [
      {
        employeeId: string;
        startDate?: Date | null;
        endDate?: Date | null;
        page: number;
        limit: number;
      },
    ]
  >();

  listAll(): Promise<any> {
    throw new Error('not used');
  }
}

class FakeEmployeeGrpcClient {
  getEmployee = jest.fn<Promise<any>, [string]>();
}

describe('ListMyAttendanceUseCase', () => {
  const employeeId = 'emp-1';
  let repo: FakeAttendanceRepository;
  let employeeClient: FakeEmployeeGrpcClient;
  let logger: AppLogger;
  let useCase: ListMyAttendanceUseCase;

  beforeEach(() => {
    repo = new FakeAttendanceRepository();
    employeeClient = new FakeEmployeeGrpcClient();
    logger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    } as unknown as AppLogger;

    useCase = new ListMyAttendanceUseCase(
      repo,
      logger,
      employeeClient as unknown as EmployeeGrpcClient,
    );
  });

  it('throws EMPLOYEE_NOT_FOUND when employee does not exist', async () => {
    employeeClient.getEmployee.mockResolvedValue({
      found: false,
      isActive: true,
    });

    await expect(
      useCase.execute({
        employeeId,
        page: 1,
        limit: 10,
        startDate: null,
        endDate: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(repo.listMy).not.toHaveBeenCalled();
  });

  it('throws EMPLOYEE_NOT_ACTIVE when employee is inactive', async () => {
    employeeClient.getEmployee.mockResolvedValue({
      found: true,
      isActive: false,
    });

    await expect(
      useCase.execute({
        employeeId,
        page: 1,
        limit: 10,
        startDate: null,
        endDate: null,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repo.listMy).not.toHaveBeenCalled();
  });

  it('throws EMPLOYEE_LOOKUP_FAILED when gRPC lookup throws', async () => {
    employeeClient.getEmployee.mockRejectedValue(new Error('grpc down'));

    await expect(
      useCase.execute({
        employeeId,
        page: 1,
        limit: 10,
        startDate: null,
        endDate: null,
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(repo.listMy).not.toHaveBeenCalled();
  });

  it('throws ATTENDANCE_LIST_FAILED when repository throws', async () => {
    employeeClient.getEmployee.mockResolvedValue({
      found: true,
      isActive: true,
    });
    repo.listMy.mockRejectedValue(new Error('db down'));

    await expect(
      useCase.execute({
        employeeId,
        page: 1,
        limit: 10,
        startDate: null,
        endDate: null,
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('groups attendances by date and calculates total work hours', async () => {
    employeeClient.getEmployee.mockResolvedValue({
      found: true,
      isActive: true,
    });

    const day1 = new Date('2026-03-18T00:00:00.000Z');
    const day2 = new Date('2026-03-19T00:00:00.000Z');

    const mkAttendance = (
      over: Partial<Attendance> & { status: AttendanceStatus },
    ): Attendance =>
      ({
        id: 'att',
        employeeId,
        createdAt: new Date(),
        ...over,
      }) as Attendance;

    const records: Attendance[] = [
      mkAttendance({
        attendanceDate: day1,
        attendanceTime: new Date('2026-03-18T09:00:00.000Z'),
        status: 'IN',
      }),
      mkAttendance({
        attendanceDate: day1,
        attendanceTime: new Date('2026-03-18T17:00:00.000Z'),
        status: 'OUT',
      }),
      mkAttendance({
        attendanceDate: day2,
        attendanceTime: new Date('2026-03-19T10:00:00.000Z'),
        status: 'IN',
      }),
    ];

    repo.listMy.mockResolvedValue({
      data: records,
      total: 3,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    const result = await useCase.execute({
      employeeId,
      page: 1,
      limit: 10,
      startDate: null,
      endDate: null,
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(1);
    expect(result.data).toHaveLength(2);

    expect(result.data[0].date).toBe('2026-03-18');
    expect(result.data[0].hasCheckedIn).toBe(true);
    expect(result.data[0].hasCheckedOut).toBe(true);
    expect(result.data[0].firstInTime).toBe('2026-03-18T09:00:00.000Z');
    expect(result.data[0].lastOutTime).toBe('2026-03-18T17:00:00.000Z');
    expect(result.data[0].lastStatus).toBe('OUT');
    expect(result.data[0].totalWorkHours).toBe(8);

    expect(result.data[1].date).toBe('2026-03-19');
    expect(result.data[1].hasCheckedIn).toBe(true);
    expect(result.data[1].hasCheckedOut).toBe(false);
    expect(result.data[1].firstInTime).toBe('2026-03-19T10:00:00.000Z');
    expect(result.data[1].lastOutTime).toBeNull();
    expect(result.data[1].lastStatus).toBe('IN');
    expect(result.data[1].totalWorkHours).toBe(0);

    expect(repo.listMy).toHaveBeenCalledTimes(1);
  });
});
