import { LogoutUseCase } from './logout.usecase';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

class InMemorySessionRepository extends SessionRepository {
  public deactivated: string[] = [];
  private sessions = new Map<string, any>();

  addActiveSession(id: string) {
    this.sessions.set(id, {
      id,
      isActive: true,
      updatedAt: new Date(),
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
    this.deactivated.push(id);
    const s = this.sessions.get(id);
    if (s) {
      s.isActive = false;
      s.updatedAt = new Date();
    }
  }

  async updateLastActivity(): Promise<void> {
    throw new Error('not needed');
  }
}

describe('LogoutUseCase', () => {
  let sessions: InMemorySessionRepository;
  let logger: AppLogger;

  beforeEach(() => {
    sessions = new InMemorySessionRepository();
    logger = new AppLogger();
  });

  it('should deactivate session when session is active', async () => {
    sessions.addActiveSession('session-id');
    const useCase = new LogoutUseCase(sessions, logger);

    await useCase.execute('session-id');

    expect(sessions.deactivated).toContain('session-id');
  });

  it('should throw UnauthorizedException when session is inactive', async () => {
    const useCase = new LogoutUseCase(sessions, logger);

    await expect(useCase.execute('unknown-session')).rejects.toBeInstanceOf(
      Error,
    );
  });
});
