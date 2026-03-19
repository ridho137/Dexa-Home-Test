import { InternalServerErrorException } from '@nestjs/common';
import { ListAdminAttendanceUseCase } from './list-admin-attendance.usecase';
import { AttendanceRepository } from '../../domain/repositories/attendance.repository';
import type {
  Attendance,
  AttendanceStatus,
} from '../../domain/entities/attendance.entity';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { EmployeeGrpcClient } from '../../infrastructure/grpc/employee-grpc.client';

class FakeAttendanceRepository extends AttendanceRepository {
  create(): Promise<any> {
    throw new Error('not used');
  }
  findLastForDate(): Promise<any> {
    throw new Error('not used');
  }
  listMy(): Promise<any> {
    throw new Error('not used');
  }

  listAll = jest.fn<
    Promise<{
      data: Attendance[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>,
    [
      {
        employeeId?: string | null;
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

describe('ListAdminAttendanceUseCase', () => {
  let repo: FakeAttendanceRepository;
  let employeeClient: FakeEmployeeGrpcClient;
  let logger: AppLogger;
  let useCase: ListAdminAttendanceUseCase;

  const employeeA = 'emp-A';
  const employeeB = 'emp-B';
  const day = new Date('2026-03-18T00:00:00.000Z');

  beforeEach(() => {
    repo = new FakeAttendanceRepository();
    employeeClient = new FakeEmployeeGrpcClient();
    logger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    } as unknown as AppLogger;

    useCase = new ListAdminAttendanceUseCase(
      repo,
      logger,
      employeeClient as unknown as EmployeeGrpcClient,
    );
  });

  it('throws ATTENDANCE_LIST_FAILED when repository throws', async () => {
    repo.listAll.mockRejectedValue(new Error('db down'));

    await expect(
      useCase.execute({
        page: 1,
        limit: 10,
        employeeId: null,
        startDate: null,
        endDate: null,
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('groups records by date+employee and computes total work hours', async () => {
    const mkAttendance = (
      over: Partial<Attendance> & { status: AttendanceStatus },
    ): Attendance =>
      ({
        id: 'att',
        employeeId: employeeA,
        attendanceDate: day,
        attendanceTime: new Date('2026-03-18T00:00:00.000Z'),
        createdAt: new Date(),
        ...over,
      }) as Attendance;

    // Provide ordering that preserves insertion order in groupMap:
    // employeeA first, then employeeB.
    const records: Attendance[] = [
      mkAttendance({
        employeeId: employeeA,
        attendanceDate: day,
        attendanceTime: new Date('2026-03-18T09:00:00.000Z'),
        status: 'IN',
      }),
      mkAttendance({
        employeeId: employeeA,
        attendanceDate: day,
        attendanceTime: new Date('2026-03-18T17:00:00.000Z'),
        status: 'OUT',
      }),
      mkAttendance({
        employeeId: employeeB,
        attendanceDate: day,
        attendanceTime: new Date('2026-03-18T10:00:00.000Z'),
        status: 'IN',
      }),
    ];

    repo.listAll.mockResolvedValue({
      data: records,
      total: 3,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    employeeClient.getEmployee.mockImplementation(async (id: string) => {
      if (id === employeeA) {
        return { found: true, isActive: true, name: 'Alice' };
      }
      if (id === employeeB) {
        return { found: true, isActive: true, name: 'Bob' };
      }
      return { found: false, isActive: false };
    });

    const result = await useCase.execute({
      page: 1,
      limit: 10,
      employeeId: null,
      startDate: null,
      endDate: null,
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(1);
    expect(result.data).toHaveLength(2);

    expect(result.data[0]).toMatchObject({
      date: '2026-03-18',
      employeeId: employeeA,
      employeeName: 'Alice',
      hasCheckedIn: true,
      hasCheckedOut: true,
      firstInTime: '2026-03-18T09:00:00.000Z',
      lastOutTime: '2026-03-18T17:00:00.000Z',
      lastStatus: 'OUT',
      totalWorkHours: 8,
    });

    expect(result.data[1]).toMatchObject({
      date: '2026-03-18',
      employeeId: employeeB,
      employeeName: 'Bob',
      hasCheckedIn: true,
      hasCheckedOut: false,
      firstInTime: '2026-03-18T10:00:00.000Z',
      lastOutTime: null,
      lastStatus: 'IN',
      totalWorkHours: 0,
    });

    // caching: each unique employee should be fetched once
    expect(employeeClient.getEmployee).toHaveBeenCalledTimes(2);
    expect(employeeClient.getEmployee).toHaveBeenCalledWith(employeeA);
    expect(employeeClient.getEmployee).toHaveBeenCalledWith(employeeB);
  });
});
