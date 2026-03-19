import {
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { AttendanceRepository } from '../../domain/repositories/attendance.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { EmployeeGrpcClient } from '../../infrastructure/grpc/employee-grpc.client';
import { AttendanceStatus } from '../../domain/entities/attendance.entity';
import { CreateAttendanceUseCase } from './create-attendance.usecase';

type Attendance = {
  id: string;
  employeeId: string;
  attendanceDate: Date;
  attendanceTime: Date;
  status: AttendanceStatus;
  createdAt: Date;
};

class FakeAttendanceRepository extends AttendanceRepository {
  create = jest.fn<
    Promise<Attendance>,
    [
      {
        id: string;
        employeeId: string;
        attendanceDate: Date;
        status: AttendanceStatus;
      },
    ]
  >(async (payload) => {
    return {
      id: payload.id,
      employeeId: payload.employeeId,
      attendanceDate: payload.attendanceDate,
      attendanceTime: new Date('2026-03-18T10:20:00.000Z'),
      status: payload.status,
      createdAt: new Date(),
    };
  });

  findLastForDate = jest.fn<Promise<Attendance | null>, [string, Date]>();

  // not used in these tests
  async listMy(): Promise<any> {
    throw new Error('not implemented');
  }

  async listAll(): Promise<any> {
    throw new Error('not implemented');
  }
}

class FakeEmployeeGrpcClient {
  getEmployee = jest.fn<Promise<any>, [string]>();
}

describe('CreateAttendanceUseCase', () => {
  const employeeId = 'emp-1';
  const NOW = new Date('2026-03-18T10:15:00.000Z');
  let repo: FakeAttendanceRepository;
  let employeeClient: FakeEmployeeGrpcClient;
  let logger: AppLogger;
  let useCase: CreateAttendanceUseCase;

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

    useCase = new CreateAttendanceUseCase(
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

  it('throws INVALID_STATUS when status is invalid', async () => {
    await expect(
      useCase.execute(employeeId, 'BAD' as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(employeeClient.getEmployee).not.toHaveBeenCalled();
    expect(repo.findLastForDate).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('throws EMPLOYEE_NOT_ACTIVE when employee is missing/inactive', async () => {
    employeeClient.getEmployee.mockResolvedValue({
      found: false,
      isActive: false,
    });

    await expect(useCase.execute(employeeId, 'IN')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(repo.findLastForDate).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('throws EMPLOYEE_LOOKUP_FAILED when employee gRPC throws', async () => {
    employeeClient.getEmployee.mockRejectedValue(new Error('grpc down'));

    await expect(useCase.execute(employeeId, 'IN')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );

    expect(repo.findLastForDate).not.toHaveBeenCalled();
  });

  it('throws ATTENDANCE_LOOKUP_FAILED when repository findLastForDate fails', async () => {
    employeeClient.getEmployee.mockResolvedValue({
      found: true,
      isActive: true,
    });
    repo.findLastForDate.mockRejectedValue(new Error('db down'));

    await expect(useCase.execute(employeeId, 'IN')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('throws ATTENDANCE_OUT_REQUIRES_IN when first record is OUT', async () => {
    employeeClient.getEmployee.mockResolvedValue({
      found: true,
      isActive: true,
    });
    repo.findLastForDate.mockResolvedValue(null);

    await expect(useCase.execute(employeeId, 'OUT')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(repo.create).not.toHaveBeenCalled();
  });

  it('throws ATTENDANCE_ALREADY_COMPLETED when last status is OUT', async () => {
    employeeClient.getEmployee.mockResolvedValue({
      found: true,
      isActive: true,
    });

    const last: Attendance = {
      id: 'att-last',
      employeeId,
      attendanceDate: expectedDateOnly(),
      attendanceTime: new Date(),
      status: 'OUT',
      createdAt: new Date(),
    };
    repo.findLastForDate.mockResolvedValue(last);

    await expect(useCase.execute(employeeId, 'IN')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws ATTENDANCE_STATUS_CONFLICT when same status is consecutive', async () => {
    employeeClient.getEmployee.mockResolvedValue({
      found: true,
      isActive: true,
    });

    const last: Attendance = {
      id: 'att-last',
      employeeId,
      attendanceDate: expectedDateOnly(),
      attendanceTime: new Date(),
      status: 'IN',
      createdAt: new Date(),
    };
    repo.findLastForDate.mockResolvedValue(last);

    await expect(useCase.execute(employeeId, 'IN')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('creates attendance successfully when rules pass', async () => {
    employeeClient.getEmployee.mockResolvedValue({
      found: true,
      isActive: true,
    });
    repo.findLastForDate.mockResolvedValue(null);

    const created = await useCase.execute(employeeId, 'IN');

    expect(created.employeeId).toBe(employeeId);
    expect(created.status).toBe('IN');
    expect(repo.create).toHaveBeenCalledTimes(1);

    const [payload] = repo.create.mock.calls[0];
    expect(payload.employeeId).toBe(employeeId);
    expect(payload.status).toBe('IN');
    expect(payload.attendanceDate.getTime()).toBe(expectedDateOnly().getTime());
  });

  it('throws ATTENDANCE_CREATE_FAILED when repository create fails', async () => {
    employeeClient.getEmployee.mockResolvedValue({
      found: true,
      isActive: true,
    });
    repo.findLastForDate.mockResolvedValue(null);
    repo.create.mockRejectedValue(new Error('insert failed'));

    await expect(useCase.execute(employeeId, 'IN')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
