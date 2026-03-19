import { JwtService } from '@nestjs/jwt';
import { LoginUseCase, InvalidCredentialsError } from './login.usecase';
import { UserRepository } from '../../domain/repositories/user.repository';
import { PasswordHasher } from '../../domain/services/password-hasher.service';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

class InMemoryUserRepository extends UserRepository {
  private users = new Map<string, any>();

  setUser(user: any) {
    this.users.set(user.email, user);
    this.users.set(user.id, user);
  }

  async findByEmail(email: string): Promise<any | null> {
    return this.users.get(email) ?? null;
  }

  async findById(id: string): Promise<any | null> {
    return this.users.get(id) ?? null;
  }

  async create(): Promise<any> {
    throw new Error('not implemented in test');
  }
}

class FakePasswordHasher extends PasswordHasher {
  constructor(private readonly expectedPassword: string) {
    super();
  }

  async hash(): Promise<string> {
    throw new Error('not implemented in test');
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return plain === this.expectedPassword && hash === 'hashed-password';
  }
}

class InMemorySessionRepository extends SessionRepository {
  public created: any[] = [];
  private sessions = new Map<string, any>();

  async create(session: {
    id: string;
    userId: string;
    refreshToken: string;
  }): Promise<any> {
    this.created.push(session);
    const stored = {
      id: session.id,
      userId: session.userId,
      refreshToken: session.refreshToken,
      lastActivityAt: new Date(),
      lastRefreshAt: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(session.id, stored);
    return stored;
  }

  async findById(id: string): Promise<any | null> {
    return this.sessions.get(id) ?? null;
  }

  async updateOnRefresh(id: string): Promise<void> {
    const s = this.sessions.get(id);
    if (!s) return;
    const now = new Date();
    s.lastRefreshAt = now;
    s.lastActivityAt = now;
    s.updatedAt = now;
  }

  async deactivate(id: string): Promise<void> {
    const s = this.sessions.get(id);
    if (!s) return;
    s.isActive = false;
    s.updatedAt = new Date();
  }

  async updateLastActivity(id: string): Promise<void> {
    const s = this.sessions.get(id);
    if (!s) return;
    s.lastActivityAt = new Date();
    s.updatedAt = new Date();
  }
}

describe('LoginUseCase', () => {
  const email = 'user@example.com';
  const password = 'Valid#Pass1';

  let repo: InMemoryUserRepository;
  let jwt: JwtService;
  let sessions: InMemorySessionRepository;
  let logger: AppLogger;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
    jwt = new JwtService();
    sessions = new InMemorySessionRepository();
    logger = new AppLogger();
  });

  it('should return access and refresh tokens for valid credentials', async () => {
    const user = {
      id: 'user-id',
      email,
      passwordHash: 'hashed-password',
      role: 'EMPLOYEE' as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repo.setUser(user);

    const hasher = new FakePasswordHasher(password);
    const useCase = new LoginUseCase(repo, hasher, jwt, sessions, logger);

    const result = await useCase.execute({ email, password });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(sessions.created).toHaveLength(1);
    expect(sessions.created[0].userId).toBe(user.id);
  });

  it('should throw InvalidCredentialsError when user not found', async () => {
    const hasher = new FakePasswordHasher(password);
    const useCase = new LoginUseCase(repo, hasher, jwt, sessions, logger);

    await expect(useCase.execute({ email, password })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('should throw InvalidCredentialsError when password is wrong', async () => {
    const user = {
      id: 'user-id',
      email,
      passwordHash: 'hashed-password',
      role: 'EMPLOYEE' as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repo.setUser(user);

    const hasher = new FakePasswordHasher('SomeOther#Pass1');
    const useCase = new LoginUseCase(repo, hasher, jwt, sessions, logger);

    await expect(useCase.execute({ email, password })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });
});
