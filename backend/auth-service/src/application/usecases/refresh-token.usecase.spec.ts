import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenUseCase } from './refresh-token.usecase';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

class InMemoryUserRepository extends UserRepository {
  private users = new Map<string, any>();

  setUser(user: any) {
    this.users.set(user.id, user);
  }

  async findByEmail(_email: string): Promise<any | null> {
    throw new Error('not needed');
  }

  async findById(id: string): Promise<any | null> {
    return this.users.get(id) ?? null;
  }

  async create(): Promise<any> {
    throw new Error('not needed');
  }

  async updatePassword(_id: string, _passwordHash: string): Promise<void> {
    throw new Error('not needed');
  }
}

class InMemorySessionRepository extends SessionRepository {
  private sessions = new Map<string, any>();

  async create(session: {
    id: string;
    userId: string;
    refreshToken: string;
  }): Promise<any> {
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

describe('RefreshTokenUseCase', () => {
  const userId = 'user-id';
  const sessionId = 'session-id';

  let sessions: InMemorySessionRepository;
  let users: InMemoryUserRepository;
  let logger: AppLogger;

  beforeEach(() => {
    sessions = new InMemorySessionRepository();
    users = new InMemoryUserRepository();
    logger = new AppLogger();
  });

  it('should issue new access token for valid session and user', async () => {
    await sessions.create({
      id: sessionId,
      userId,
      refreshToken: 'dummy',
    });

    users.setUser({
      id: userId,
      email: 'user@example.com',
      role: 'EMPLOYEE',
      isActive: true,
    });

    const useCase = new RefreshTokenUseCase(
      sessions,
      users,
      // @ts-expect-error jwt is not needed for test; env.expiresIn is string
      { signAsync: () => Promise.resolve('signed-token') },
      logger,
    );

    const result = await useCase.execute(sessionId, userId);

    expect(result.accessToken).toBeDefined();
  });

  it('should throw when session is inactive', async () => {
    const useCase = new RefreshTokenUseCase(
      sessions,
      users,
      // @ts-expect-error minimal mock
      { signAsync: () => Promise.resolve('signed-token') },
      logger,
    );

    await expect(useCase.execute(sessionId, userId)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
