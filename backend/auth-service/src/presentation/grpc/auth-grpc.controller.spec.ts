import { JwtService } from '@nestjs/jwt';
import { AuthGrpcController } from './auth-grpc.controller';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { env } from '../../config/env';

class InMemorySessionRepository extends SessionRepository {
  private sessions = new Map<string, any>();

  addActiveSession(id: string, userId: string) {
    this.sessions.set(id, {
      id,
      userId,
      isActive: true,
    });
  }

  async create(): Promise<any> {
    throw new Error('not needed');
  }

  async findById(id: string): Promise<any | null> {
    return this.sessions.get(id) ?? null;
  }

  async updateOnRefresh(): Promise<void> {
    throw new Error('not needed');
  }

  async deactivate(id: string): Promise<void> {
    const s = this.sessions.get(id);
    if (s) {
      s.isActive = false;
    }
  }

  async updateLastActivity(id: string): Promise<void> {
    const s = this.sessions.get(id);
    if (s) {
      s.lastActivityAt = new Date();
      s.updatedAt = new Date();
    }
  }
}

class InMemoryUserRepository extends UserRepository {
  private users = new Map<string, any>();

  addActiveUser(user: any) {
    this.users.set(user.id, user);
  }

  async findByEmail(): Promise<any | null> {
    throw new Error('not needed');
  }

  async findById(id: string): Promise<any | null> {
    return this.users.get(id) ?? null;
  }

  async create(): Promise<any> {
    throw new Error('not needed');
  }
}

describe('AuthGrpcController', () => {
  let jwt: JwtService;
  let sessions: InMemorySessionRepository;
  let users: InMemoryUserRepository;
  let logger: AppLogger;
  let controller: AuthGrpcController;

  const userId = 'user-id';
  const sessionId = 'session-id';

  beforeEach(() => {
    jwt = new JwtService();
    sessions = new InMemorySessionRepository();
    users = new InMemoryUserRepository();
    logger = new AppLogger();
    controller = new AuthGrpcController(jwt, sessions, users, logger);
  });

  it('CheckAccessToken should return valid=true for correct token/session/user', async () => {
    sessions.addActiveSession(sessionId, userId);
    users.addActiveUser({
      id: userId,
      email: 'user@example.com',
      role: 'EMPLOYEE',
      isActive: true,
    });

    const token = await jwt.signAsync(
      {
        sub: userId,
        sid: sessionId,
        email: 'user@example.com',
        role: 'EMPLOYEE',
      },
      { secret: env.jwt.secret },
    );

    const res = await controller.checkAccessToken({ token });

    expect(res.valid).toBe(true);
    expect(res.userId).toBe(userId);
    expect(res.sessionId).toBe(sessionId);
    expect(res.email).toBe('user@example.com');
    expect(res.role).toBe('EMPLOYEE');
  });

  it('CheckAccessToken should return valid=false for invalid token', async () => {
    const res = await controller.checkAccessToken({ token: 'invalid' });

    expect(res.valid).toBe(false);
    expect(res.errorCode).toBe('INVALID_ACCESS_TOKEN');
  });

  it('CheckRefreshToken should return valid=true for correct refresh token/session/user', async () => {
    sessions.addActiveSession(sessionId, userId);
    users.addActiveUser({
      id: userId,
      email: 'user@example.com',
      role: 'EMPLOYEE',
      isActive: true,
    });

    const token = await jwt.signAsync(
      {
        sub: userId,
        sid: sessionId,
        tokenType: 'refresh',
      },
      { secret: env.jwt.refreshSecret },
    );

    const res = await controller.checkRefreshToken({ token });

    expect(res.valid).toBe(true);
    expect(res.userId).toBe(userId);
    expect(res.sessionId).toBe(sessionId);
  });

  it('CheckRefreshToken should return valid=false for invalid token', async () => {
    const res = await controller.checkRefreshToken({ token: 'invalid' });

    expect(res.valid).toBe(false);
    expect(res.errorCode).toBe('INVALID_REFRESH_TOKEN');
  });
});
