import {
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ChangeMyPasswordUseCase } from './change-my-password.usecase';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { Employee } from '../../domain/entities/employee.entity';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { AuthGrpcClient } from '../../infrastructure/grpc/auth-grpc.client';
import { NotificationRabbitMqPublisher } from '../../infrastructure/rabbitmq/notification-rabbitmq.publisher';

class InMemoryEmployeeRepository extends EmployeeRepository {
  private byId = new Map<string, Employee>();

  setEmployee(emp: Employee) {
    this.byId.set(emp.id, emp);
  }

  async findById(id: string): Promise<Employee | null> {
    return this.byId.get(id) ?? null;
  }

  async findByEmail(): Promise<Employee | null> {
    return null;
  }

  async create(): Promise<Employee> {
    throw new Error('not implemented');
  }

  async updateProfile(): Promise<Employee> {
    throw new Error('not implemented');
  }

  async adminUpdate(): Promise<Employee> {
    throw new Error('not implemented');
  }

  async findAll(): Promise<Employee[]> {
    return Array.from(this.byId.values());
  }

  async findWithFilters(): Promise<any> {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

class FakeAuthGrpcClient {
  public nextResult: { success: boolean; errorCode?: string } = {
    success: true,
  };

  changePassword = jest.fn(
    async (): Promise<{ success: boolean; errorCode?: string }> =>
      this.nextResult,
  );
}

describe('ChangeMyPasswordUseCase', () => {
  const userId = 'user-1';
  let repo: InMemoryEmployeeRepository;
  let authGrpc: FakeAuthGrpcClient;
  let logger: AppLogger;
  let notificationPublisher: NotificationRabbitMqPublisher;
  let useCase: ChangeMyPasswordUseCase;

  beforeEach(() => {
    repo = new InMemoryEmployeeRepository();
    authGrpc = new FakeAuthGrpcClient();
    logger = new AppLogger();

    notificationPublisher = {
      publish: jest.fn(async () => undefined),
    } as unknown as NotificationRabbitMqPublisher;

    useCase = new ChangeMyPasswordUseCase(
      repo,
      authGrpc as unknown as AuthGrpcClient,
      logger,
      notificationPublisher,
    );
  });

  it('calls auth changePassword when employee exists', async () => {
    const emp: Employee = {
      id: userId,
      name: 'John',
      email: 'john@example.com',
      position: 'Dev',
      role: 'EMPLOYEE',
      phoneNumber: null,
      photoUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repo.setEmployee(emp);

    await useCase.execute(userId, {
      oldPassword: 'Old#1234',
      newPassword: 'New#1234',
    });

    expect(authGrpc.changePassword).toHaveBeenCalledWith(
      userId,
      'Old#1234',
      'New#1234',
    );
  });

  it('throws UnauthorizedException when employee not found', async () => {
    await expect(
      useCase.execute(userId, {
        oldPassword: 'Old#1234',
        newPassword: 'New#1234',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('wraps repo errors as InternalServerErrorException', async () => {
    jest.spyOn(repo, 'findById').mockRejectedValueOnce(new Error('db error'));

    await expect(
      useCase.execute(userId, {
        oldPassword: 'Old#1234',
        newPassword: 'New#1234',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('maps INVALID_OLD_PASSWORD to BadRequestException', async () => {
    const emp: Employee = {
      id: userId,
      name: 'John',
      email: 'john@example.com',
      position: 'Dev',
      role: 'EMPLOYEE',
      phoneNumber: null,
      photoUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repo.setEmployee(emp);
    authGrpc.nextResult = { success: false, errorCode: 'INVALID_OLD_PASSWORD' };

    await expect(
      useCase.execute(userId, {
        oldPassword: 'wrong',
        newPassword: 'New#1234',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps WEAK_PASSWORD to BadRequestException', async () => {
    const emp: Employee = {
      id: userId,
      name: 'John',
      email: 'john@example.com',
      position: 'Dev',
      role: 'EMPLOYEE',
      phoneNumber: null,
      photoUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repo.setEmployee(emp);
    authGrpc.nextResult = { success: false, errorCode: 'WEAK_PASSWORD' };

    await expect(
      useCase.execute(userId, {
        oldPassword: 'Old#1234',
        newPassword: 'weak',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps USER_INACTIVE to UnauthorizedException', async () => {
    const emp: Employee = {
      id: userId,
      name: 'John',
      email: 'john@example.com',
      position: 'Dev',
      role: 'EMPLOYEE',
      phoneNumber: null,
      photoUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repo.setEmployee(emp);
    authGrpc.nextResult = { success: false, errorCode: 'USER_INACTIVE' };

    await expect(
      useCase.execute(userId, {
        oldPassword: 'Old#1234',
        newPassword: 'New#1234',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('wraps unexpected auth errorCode as InternalServerErrorException', async () => {
    const emp: Employee = {
      id: userId,
      name: 'John',
      email: 'john@example.com',
      position: 'Dev',
      role: 'EMPLOYEE',
      phoneNumber: null,
      photoUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repo.setEmployee(emp);
    authGrpc.nextResult = { success: false, errorCode: 'SOMETHING_ELSE' };

    await expect(
      useCase.execute(userId, {
        oldPassword: 'Old#1234',
        newPassword: 'New#1234',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
