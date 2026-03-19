import { InternalServerErrorException } from '@nestjs/common';
import { ChangePasswordUseCase } from './change-password.usecase';
import { UserRepository } from '../../domain/repositories/user.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { PasswordHasher } from '../../domain/services/password-hasher.service';

class InMemoryUserRepository extends UserRepository {
  private users = new Map<string, any>();
  public failOnFind = false;
  public failOnUpdate = false;

  setUser(user: any) {
    this.users.set(user.id, user);
  }

  async findByEmail(): Promise<any | null> {
    throw new Error('not needed');
  }

  async findById(id: string): Promise<any | null> {
    if (this.failOnFind) {
      throw new Error('find error');
    }
    return this.users.get(id) ?? null;
  }

  async create(): Promise<any> {
    throw new Error('not needed');
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    if (this.failOnUpdate) {
      throw new Error('update error');
    }
    const user = this.users.get(id);
    if (user) {
      user.passwordHash = passwordHash;
    }
  }
}

class FakePasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return `hashed-${password}`;
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed-${plain}`;
  }
}

describe('ChangePasswordUseCase', () => {
  const userId = 'user-1';

  let users: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let logger: AppLogger;
  let useCase: ChangePasswordUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    logger = new AppLogger();
    useCase = new ChangePasswordUseCase(users, hasher, logger);

    users.setUser({
      id: userId,
      email: 'user@example.com',
      passwordHash: 'hashed-Old#1234',
      isActive: true,
    });
  });

  it('should change password when old password is valid and new password strong', async () => {
    const result = await useCase.execute(userId, 'Old#1234', 'NewPass#1234');

    expect(result.success).toBe(true);
    const updatedUser = await users.findById(userId);
    expect(updatedUser.passwordHash).toBe('hashed-NewPass#1234');
  });

  it('should return INVALID_OLD_PASSWORD when old password is wrong', async () => {
    const result = await useCase.execute(userId, 'Wrong#1234', 'NewPass#1234');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INVALID_OLD_PASSWORD');
  });

  it('should return WEAK_PASSWORD when new password does not meet policy', async () => {
    const result = await useCase.execute(userId, 'Old#1234', 'weak');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('WEAK_PASSWORD');
  });

  it('should return USER_INACTIVE when user is inactive', async () => {
    users.setUser({
      id: userId,
      email: 'user@example.com',
      passwordHash: 'hashed-Old#1234',
      isActive: false,
    });

    const result = await useCase.execute(userId, 'Old#1234', 'NewPass#1234');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('USER_INACTIVE');
  });

  it('should throw InternalServerErrorException when repository find fails', async () => {
    users.failOnFind = true;

    await expect(
      useCase.execute(userId, 'Old#1234', 'NewPass#1234'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('should throw InternalServerErrorException when repository update fails', async () => {
    users.failOnUpdate = true;

    await expect(
      useCase.execute(userId, 'Old#1234', 'NewPass#1234'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
