import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { GetEmployeeByIdUseCase } from './get-employee-by-id.usecase';
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

  async adminUpdate(): Promise<Employee> {
    throw new Error('not implemented');
  }

  async findAll(): Promise<Employee[]> {
    return [];
  }

  async findWithFilters(): Promise<any> {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

describe('GetEmployeeByIdUseCase', () => {
  const id = 'emp-1';
  let repo: InMemoryEmployeeRepository;
  let logger: AppLogger;
  let useCase: GetEmployeeByIdUseCase;

  beforeEach(() => {
    repo = new InMemoryEmployeeRepository();
    logger = new AppLogger();
    useCase = new GetEmployeeByIdUseCase(repo, logger);
  });

  it('returns employee when found', async () => {
    const employee: Employee = {
      id,
      name: 'Admin HR',
      email: 'admin@dexa.local',
      position: 'HRD',
      role: 'ADMIN_HR',
      phoneNumber: '+123',
      photoUrl: 'http://photo',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repo.setEmployee(employee);

    const result = await useCase.execute(id);
    expect(result).toEqual(employee);
  });

  it('throws NotFoundException when missing', async () => {
    await expect(useCase.execute(id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('wraps repo errors as InternalServerErrorException', async () => {
    jest.spyOn(repo, 'findById').mockRejectedValueOnce(new Error('db error'));

    await expect(useCase.execute(id)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
