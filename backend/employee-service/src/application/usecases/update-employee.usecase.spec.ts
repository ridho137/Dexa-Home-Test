import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateEmployeeUseCase } from './update-employee.usecase';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { Employee } from '../../domain/entities/employee.entity';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

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

  async adminUpdate(
    id: string,
    payload: { name?: string; position?: string; phoneNumber?: string | null },
  ): Promise<Employee> {
    const existing = this.byId.get(id);
    if (!existing) {
      throw new Error('EMPLOYEE_NOT_FOUND');
    }
    const updated: Employee = {
      ...existing,
      name: payload.name ?? existing.name,
      position: payload.position ?? existing.position,
      phoneNumber: payload.phoneNumber ?? existing.phoneNumber,
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async findAll(): Promise<Employee[]> {
    return Array.from(this.byId.values());
  }

  async findWithFilters(): Promise<any> {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

describe('UpdateEmployeeUseCase', () => {
  const id = 'emp-1';
  let repo: InMemoryEmployeeRepository;
  let logger: AppLogger;
  let useCase: UpdateEmployeeUseCase;

  beforeEach(() => {
    repo = new InMemoryEmployeeRepository();
    logger = new AppLogger();
    useCase = new UpdateEmployeeUseCase(repo, logger);
  });

  it('updates name, position, and phoneNumber', async () => {
    const employee: Employee = {
      id,
      name: 'Old Name',
      email: 'old@example.com',
      position: 'Old Position',
      role: 'EMPLOYEE',
      phoneNumber: '+62000',
      photoUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repo.setEmployee(employee);

    const updated = await useCase.execute(id, {
      name: 'New Name',
      position: 'New Position',
      phoneNumber: '+62111',
    });

    expect(updated.name).toBe('New Name');
    expect(updated.position).toBe('New Position');
    expect(updated.phoneNumber).toBe('+62111');
  });

  it('keeps existing values when fields are empty string', async () => {
    const employee: Employee = {
      id,
      name: 'Name',
      email: 'a@example.com',
      position: 'Pos',
      role: 'EMPLOYEE',
      phoneNumber: '+62000',
      photoUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repo.setEmployee(employee);

    const updated = await useCase.execute(id, {
      name: '',
      position: '',
      phoneNumber: '',
    });

    expect(updated.name).toBe('Name');
    expect(updated.position).toBe('Pos');
    expect(updated.phoneNumber).toBe('+62000');
  });

  it('throws NotFoundException when employee does not exist', async () => {
    await expect(
      useCase.execute(id, { name: 'X', position: 'Y', phoneNumber: '+62' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('wraps repo lookup errors as InternalServerErrorException', async () => {
    jest.spyOn(repo, 'findById').mockRejectedValueOnce(new Error('db error'));

    await expect(
      useCase.execute(id, { name: 'X', position: 'Y', phoneNumber: '+62' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
