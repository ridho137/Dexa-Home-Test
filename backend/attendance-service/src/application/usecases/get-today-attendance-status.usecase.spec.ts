import {
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GetTodayAttendanceStatusUseCase } from './get-today-attendance-status.usecase';
import { AttendanceRepository } from '../../domain/repositories/attendance.repository';
import type {
  Attendance,
  AttendanceStatus,
} from '../../domain/entities/attendance.entity';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { EmployeeGrpcClient } from '../../infrastructure/grpc/employee-grpc.client';

type TodayAttendanceStatus = {
  date: string;
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  firstInTime: Date | null;
  lastOutTime: Date | null;
  lastStatus: 'IN' | 'OUT' | null;
};

class FakeAttendanceRepository extends AttendanceRepository {
  create(): Promise<any> {
    throw new Error('not used');
  }
  findLastForDate(): Promise<any> {
    throw new Error('not used');
  }
  listAll(): Promise<any> {
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
}

class FakeEmployeeGrpcClient {
  getEmployee = jest.fn<Promise<any>, [string]>();
}

describe('GetTodayAttendanceStatusUseCase', () => {
  const employeeId = 'emp-1';
  const NOW = new Date('2026-03-18T10:15:00.000Z');
  let repo: FakeAttendanceRepository;
  let employeeClient: FakeEmployeeGrpcClient;
  let logger: AppLogger;
  let useCase: GetTodayAttendanceStatusUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);

    repo = new FakeAttendanceRepository();
    employeeClient = new FakeEmployeeGrpcClient();
    logger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    } as unknown as AppLogger;

    useCase = new GetTodayAttendanceStatusUseCase(
      repo,
      logger,
      employeeClient as unknown as EmployeeGrpcClient,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const expectedDateOnly = () =>
    new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());

  it('throws EMPLOYEE_NOT_FOUND when employee does not exist', async () => {
    employeeClient.getEmployee.mockResolvedValue({
      found: false,
      isActive: true,
    });

    await expect(useCase.execute(employeeId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws EMPLOYEE_NOT_ACTIVE when employee is inactive', async () => {
    employeeClient.getEmployee.mockResolvedValue({
      found: true,
      isActive: false,
    });

    await expect(useCase.execute(employeeId)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws EMPLOYEE_LOOKUP_FAILED when employee gRPC throws non-business error', async () => {
    employeeClient.getEmployee.mockRejectedValue(new Error('grpc down'));

    await expect(useCase.execute(employeeId)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('throws ATTENDANCE_LIST_FAILED when repository throws', async () => {
    employeeClient.getEmployee.mockResolvedValue({
      found: true,
      isActive: true,
    });
    repo.listMy.mockRejectedValue(new Error('db down'));

    await expect(useCase.execute(employeeId)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('returns today attendance status from repository records', async () => {
    employeeClient.getEmployee.mockResolvedValue({
      found: true,
      isActive: true,
    });

    const dateOnly = expectedDateOnly();
    const dayDateKey = dateOnly.toISOString().slice(0, 10);

    const mk = (
      over: Partial<Attendance> & { status: AttendanceStatus },
    ): Attendance =>
      ({
        id: 'att',
        employeeId,
        attendanceDate: dateOnly,
        attendanceTime: dateOnly,
        status: over.status,
        createdAt: new Date(),
        ...over,
      }) as Attendance;

    const records: Attendance[] = [
      mk({
        status: 'OUT',
        attendanceTime: new Date('2026-03-18T17:00:00.000Z'),
      }),
      mk({
        status: 'IN',
        attendanceTime: new Date('2026-03-18T09:00:00.000Z'),
      }),
    ];

    repo.listMy.mockResolvedValue({
      data: records,
      total: 2,
      page: 1,
      limit: 100,
      totalPages: 1,
    });

    const result = await useCase.execute(employeeId);

    expect(result.date).toBe(dayDateKey);
    expect(result.hasCheckedIn).toBe(true);
    expect(result.hasCheckedOut).toBe(true);
    expect(result.firstInTime).toBeInstanceOf(Date);
    expect(result.lastOutTime).toBeInstanceOf(Date);
    expect((result.firstInTime as Date).toISOString()).toBe(
      '2026-03-18T09:00:00.000Z',
    );
    expect((result.lastOutTime as Date).toISOString()).toBe(
      '2026-03-18T17:00:00.000Z',
    );
    expect(result.lastStatus).toBe('OUT');

    expect(repo.listMy).toHaveBeenCalledTimes(1);
  });

  it('returns empty status when there are no records', async () => {
    employeeClient.getEmployee.mockResolvedValue({
      found: true,
      isActive: true,
    });

    repo.listMy.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 0,
    });

    const result: TodayAttendanceStatus = await useCase.execute(employeeId);

    expect(result.date).toBe(expectedDateOnly().toISOString().slice(0, 10));
    expect(result.hasCheckedIn).toBe(false);
    expect(result.hasCheckedOut).toBe(false);
    expect(result.firstInTime).toBeNull();
    expect(result.lastOutTime).toBeNull();
    expect(result.lastStatus).toBeNull();
  });
});
