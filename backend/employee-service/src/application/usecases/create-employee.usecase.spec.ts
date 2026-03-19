import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateEmployeeUseCase } from './create-employee.usecase';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { Employee } from '../../domain/entities/employee.entity';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { AuthGrpcClient } from '../../infrastructure/grpc/auth-grpc.client';

class InMemoryEmployeeRepository extends EmployeeRepository {
  private employees: Employee[] = [];

  async findById(): Promise<Employee | null> {
    return null;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    return this.employees.find((e) => e.email === email) ?? null;
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
    if (this.employees.some((e) => e.email === payload.email)) {
      const err: any = new Error('duplicate');
      err.code = '23505';
      throw err;
    }
    const emp: Employee = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      position: payload.position,
      role: payload.role ?? 'EMPLOYEE',
      phoneNumber: payload.phoneNumber ?? null,
      photoUrl: payload.photoUrl ?? null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.employees.push(emp);
    return emp;
  }

  async updateProfile(): Promise<Employee> {
    throw new Error('not implemented');
  }

  async adminUpdate(): Promise<Employee> {
    throw new Error('not implemented');
  }

  async findAll(): Promise<Employee[]> {
    return this.employees;
  }

  async findWithFilters(): Promise<any> {
    return {
      data: this.employees,
      total: this.employees.length,
      page: 1,
      limit: 10,
      totalPages: 1,
    };
  }
}

class FakeAuthGrpcClient {
  public nextResult: { success: boolean; errorCode?: string } = {
    success: true,
  };
  createUser = jest.fn(
    async (): Promise<{ success: boolean; errorCode?: string }> =>
      this.nextResult,
  );
}

describe('CreateEmployeeUseCase', () => {
  let repo: InMemoryEmployeeRepository;
  let authGrpc: FakeAuthGrpcClient;
  let logger: AppLogger;
  let useCase: CreateEmployeeUseCase;

  beforeEach(() => {
    repo = new InMemoryEmployeeRepository();
    authGrpc = new FakeAuthGrpcClient();
    logger = new AppLogger();
    // cast authGrpc to AuthGrpcClient to satisfy constructor typing
    useCase = new CreateEmployeeUseCase(
      repo,
      authGrpc as unknown as AuthGrpcClient,
      logger,
    );
  });

  it('creates employee when auth user creation succeeds', async () => {
    const created = await useCase.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password#123',
      position: 'Dev',
      role: 'EMPLOYEE',
      phoneNumber: '+62000',
    });

    expect(created.id).toBeDefined();
    expect(created.email).toBe('john@example.com');
    expect(authGrpc.createUser).toHaveBeenCalled();
  });

  it('maps EMAIL_ALREADY_EXISTS from auth to ConflictException', async () => {
    authGrpc.nextResult = { success: false, errorCode: 'EMAIL_ALREADY_EXISTS' };

    await expect(
      useCase.execute({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password#123',
        position: 'Dev',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps WEAK_PASSWORD from auth to BadRequestException', async () => {
    authGrpc.nextResult = { success: false, errorCode: 'WEAK_PASSWORD' };

    await expect(
      useCase.execute({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weak',
        position: 'Dev',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('wraps unexpected auth errors as InternalServerErrorException', async () => {
    authGrpc.nextResult = { success: false, errorCode: 'INTERNAL_ERROR' };

    await expect(
      useCase.execute({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password#123',
        position: 'Dev',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('maps repository duplicate email error to ConflictException', async () => {
    authGrpc.nextResult = { success: true };
    // seed one employee first
    await useCase.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password#123',
      position: 'Dev',
    });

    await expect(
      useCase.execute({
        name: 'John 2',
        email: 'john@example.com',
        password: 'Password#123',
        position: 'Dev',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
