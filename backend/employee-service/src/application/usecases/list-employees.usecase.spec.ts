import { InternalServerErrorException } from '@nestjs/common';
import { ListEmployeesUseCase } from './list-employees.usecase';
import {
  EmployeeRepository,
  ListEmployeesFilters,
  ListEmployeesResult,
} from '../../domain/repositories/employee.repository';
import { Employee } from '../../domain/entities/employee.entity';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

class InMemoryEmployeeRepository extends EmployeeRepository {
  private employees: Employee[] = [];

  setEmployees(emps: Employee[]) {
    this.employees = emps;
  }

  async findById(): Promise<Employee | null> {
    return null;
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
    return this.employees;
  }

  async findWithFilters(
    filters: ListEmployeesFilters,
  ): Promise<ListEmployeesResult> {
    const { page, limit } = filters;
    const total = this.employees.length;
    const data = this.employees.slice((page - 1) * limit, page * limit);
    return {
      data,
      total,
      page,
      limit,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    };
  }
}

describe('ListEmployeesUseCase', () => {
  let repo: InMemoryEmployeeRepository;
  let logger: AppLogger;
  let useCase: ListEmployeesUseCase;

  beforeEach(() => {
    repo = new InMemoryEmployeeRepository();
    logger = new AppLogger();
    useCase = new ListEmployeesUseCase(repo, logger);
  });

  it('returns paginated employees', async () => {
    const base: Employee = {
      id: '',
      name: '',
      email: '',
      position: '',
      role: 'EMPLOYEE',
      phoneNumber: null,
      photoUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repo.setEmployees([
      { ...base, id: '1', name: 'A', email: 'a@example.com' },
      { ...base, id: '2', name: 'B', email: 'b@example.com' },
      { ...base, id: '3', name: 'C', email: 'c@example.com' },
    ]);

    const res = await useCase.execute({
      page: 1,
      limit: 2,
      role: null,
      search: null,
    });

    expect(res.total).toBe(3);
    expect(res.page).toBe(1);
    expect(res.limit).toBe(2);
    expect(res.totalPages).toBe(2);
    expect(res.data).toHaveLength(2);
  });

  it('wraps repository errors as InternalServerErrorException', async () => {
    jest
      .spyOn(repo, 'findWithFilters')
      .mockRejectedValueOnce(new Error('db error'));

    await expect(
      useCase.execute({ page: 1, limit: 10, role: null, search: null }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
