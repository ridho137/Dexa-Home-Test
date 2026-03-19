import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { GetMeUseCase } from './get-me.usecase';
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

describe('GetMeUseCase', () => {
  const userId = 'user-1';
  let repo: InMemoryEmployeeRepository;
  let logger: AppLogger;
  let useCase: GetMeUseCase;

  beforeEach(() => {
    repo = new InMemoryEmployeeRepository();
    logger = new AppLogger();
    useCase = new GetMeUseCase(repo, logger);
  });

  it('returns profile when employee exists', async () => {
    const employee: Employee = {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      position: 'Dev',
      role: 'EMPLOYEE',
      phoneNumber: '+621234',
      photoUrl: 'http://photo',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repo.setEmployee(employee);

    const result = await useCase.execute(userId);

    expect(result).toEqual({
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      position: 'Dev',
      phoneNumber: '+621234',
      photoUrl: 'http://photo',
      isActive: true,
    });
  });

  it('throws NotFoundException when employee missing', async () => {
    await expect(useCase.execute(userId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('wraps repository errors as InternalServerErrorException', async () => {
    jest.spyOn(repo, 'findById').mockRejectedValueOnce(new Error('db error'));

    await expect(useCase.execute(userId)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
