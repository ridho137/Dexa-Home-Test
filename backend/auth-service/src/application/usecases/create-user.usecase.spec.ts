import { InternalServerErrorException } from '@nestjs/common';
import { CreateUserUseCase } from './create-user.usecase';
import { UserRepository } from '../../domain/repositories/user.repository';
import { PasswordHasher } from '../../domain/services/password-hasher.service';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

type TestUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: 'EMPLOYEE' | 'ADMIN_HR';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

class InMemoryUserRepository extends UserRepository {
  private users: TestUser[] = [];
  private throwOnFindByEmail: Error | null = null;
  private throwOnCreate: Error | null = null;

  seed(users: TestUser[]) {
    this.users = users;
  }

  setThrowOnFindByEmail(err: Error | null) {
    this.throwOnFindByEmail = err;
  }

  setThrowOnCreate(err: Error | null) {
    this.throwOnCreate = err;
  }

  async findByEmail(email: string): Promise<TestUser | null> {
    if (this.throwOnFindByEmail) throw this.throwOnFindByEmail;
    return this.users.find((u) => u.email === email) ?? null;
  }

  async findById(_id: string): Promise<TestUser | null> {
    return null;
  }

  async create(payload: {
    id: string;
    email: string;
    passwordHash: string;
    role: TestUser['role'];
  }): Promise<TestUser> {
    if (this.throwOnCreate) throw this.throwOnCreate;

    const user: TestUser = {
      id: payload.id,
      email: payload.email,
      passwordHash: payload.passwordHash,
      role: payload.role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.push(user);
    return user;
  }

  async updatePassword(): Promise<void> {
    // not used in these tests
  }
}

class FakePasswordHasher extends PasswordHasher {
  public hashCalls: string[] = [];
  constructor(private readonly opts?: { throwOnHash?: boolean }) {
    super();
  }

  async hash(plain: string): Promise<string> {
    this.hashCalls.push(plain);
    if (this.opts?.throwOnHash) {
      throw new Error('hash failed');
    }
    return `hashed:${plain}`;
  }

  async compare(_plain: string, _hash: string): Promise<boolean> {
    return true;
  }
}

describe('CreateUserUseCase', () => {
  let repo: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let logger: AppLogger;
  let useCase: CreateUserUseCase;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    logger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    } as unknown as AppLogger;

    useCase = new CreateUserUseCase(repo, hasher, logger);
  });

  it('returns success when user does not exist and password is strong', async () => {
    repo.seed([]);

    const result = await useCase.execute(
      'user-1',
      'user@example.com',
      'Admin#1234',
      'EMPLOYEE',
    );

    expect(result).toEqual({ success: true });
    expect(hasher.hashCalls).toEqual(['Admin#1234']);
  });

  it('maps existing email to EMAIL_ALREADY_EXISTS', async () => {
    repo.seed([
      {
        id: 'user-existing',
        email: 'user@example.com',
        passwordHash: 'hashed:existing',
        role: 'EMPLOYEE',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await useCase.execute(
      'user-2',
      'user@example.com',
      'Admin#1234',
      'EMPLOYEE',
    );

    expect(result).toEqual({
      success: false,
      errorCode: 'EMAIL_ALREADY_EXISTS',
    });
    expect(hasher.hashCalls).toHaveLength(0);
  });

  it('maps weak password to WEAK_PASSWORD', async () => {
    repo.seed([]);

    const result = await useCase.execute(
      'user-2',
      'user@example.com',
      'weak',
      'EMPLOYEE',
    );

    expect(result).toEqual({ success: false, errorCode: 'WEAK_PASSWORD' });
    expect(hasher.hashCalls).toHaveLength(0);
  });

  it('throws InternalServerErrorException when findByEmail throws', async () => {
    repo.setThrowOnFindByEmail(new Error('db down'));

    await expect(
      useCase.execute('user-1', 'user@example.com', 'Admin#1234', 'EMPLOYEE'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('throws InternalServerErrorException when hashing fails', async () => {
    hasher = new FakePasswordHasher({ throwOnHash: true });
    useCase = new CreateUserUseCase(repo, hasher, logger);

    await expect(
      useCase.execute('user-1', 'user@example.com', 'Admin#1234', 'EMPLOYEE'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('maps duplicate email error (23505) from create to EMAIL_ALREADY_EXISTS', async () => {
    repo.seed([]);
    const err: any = new Error('duplicate');
    err.code = '23505';
    repo.setThrowOnCreate(err);

    const result = await useCase.execute(
      'user-1',
      'user@example.com',
      'Admin#1234',
      'EMPLOYEE',
    );

    expect(result).toEqual({
      success: false,
      errorCode: 'EMAIL_ALREADY_EXISTS',
    });
  });

  it('throws InternalServerErrorException when create throws unexpected error', async () => {
    repo.seed([]);
    repo.setThrowOnCreate(new Error('unknown'));

    await expect(
      useCase.execute(
        'user-1',
        'user@example.com',
        'Admin#1234',
        'EMPLOYEE',
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

