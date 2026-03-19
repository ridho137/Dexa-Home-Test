import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateMyProfileUseCase } from './update-my-profile.usecase';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { Employee } from '../../domain/entities/employee.entity';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { S3StorageService } from '../../infrastructure/services/s3-storage.service';
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

  async updateProfile(
    id: string,
    payload: { phoneNumber?: string | null; photoUrl?: string | null },
  ): Promise<Employee> {
    const existing = this.byId.get(id);
    if (!existing) {
      const err = new Error('EMPLOYEE_NOT_FOUND');
      throw err;
    }
    const updated: Employee = {
      ...existing,
      phoneNumber:
        payload.phoneNumber !== undefined
          ? payload.phoneNumber
          : existing.phoneNumber,
      photoUrl:
        payload.photoUrl !== undefined ? payload.photoUrl : existing.photoUrl,
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
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

class FakeS3StorageService implements Partial<S3StorageService> {
  public uploaded: { key: string; mime: string }[] = [];

  async uploadObject(key: string, body: Buffer, contentType: string) {
    this.uploaded.push({ key, mime: contentType });
  }

  buildPublicUrl(key: string): string {
    return `https://bucket/${key}`;
  }
}

describe('UpdateMyProfileUseCase', () => {
  const userId = 'user-1';
  let repo: InMemoryEmployeeRepository;
  let logger: AppLogger;
  let storage: FakeS3StorageService;
  let useCase: UpdateMyProfileUseCase;
  let notificationPublisher: NotificationRabbitMqPublisher;

  beforeEach(() => {
    repo = new InMemoryEmployeeRepository();
    logger = new AppLogger();
    storage = new FakeS3StorageService();

    notificationPublisher = {
      publish: jest.fn(async () => undefined),
    } as unknown as NotificationRabbitMqPublisher;

    useCase = new UpdateMyProfileUseCase(
      repo,
      logger,
      storage as unknown as S3StorageService,
      notificationPublisher,
    );
  });

  it('updates phoneNumber and uploads photo when file provided', async () => {
    const employee: Employee = {
      id: userId,
      name: 'John',
      email: 'john@example.com',
      position: 'Dev',
      role: 'EMPLOYEE',
      phoneNumber: '+62000',
      photoUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repo.setEmployee(employee);

    const result = await useCase.execute(
      userId,
      { phoneNumber: '+62111' },
      {
        buffer: Buffer.from('file'),
        mimetype: 'image/png',
        originalName: 'pic.png',
      },
    );

    expect(result.phoneNumber).toBe('+62111');
    expect(result.photoUrl).toBe('https://bucket/profile/user-1');
    expect(storage.uploaded).toHaveLength(1);
  });

  it('keeps existing phoneNumber when not provided', async () => {
    const employee: Employee = {
      id: userId,
      name: 'John',
      email: 'john@example.com',
      position: 'Dev',
      role: 'EMPLOYEE',
      phoneNumber: '+62000',
      photoUrl: 'https://bucket/profile/user-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repo.setEmployee(employee);

    const result = await useCase.execute(userId, {}, undefined);

    expect(result.phoneNumber).toBe('+62000');
    expect(result.photoUrl).toBe('https://bucket/profile/user-1');
  });

  it('throws NotFoundException when employee does not exist', async () => {
    await expect(
      useCase.execute(userId, { phoneNumber: '+62111' }, undefined),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('wraps repo lookup errors as InternalServerErrorException', async () => {
    jest.spyOn(repo, 'findById').mockRejectedValueOnce(new Error('db error'));

    await expect(
      useCase.execute(userId, { phoneNumber: '+62111' }, undefined),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
