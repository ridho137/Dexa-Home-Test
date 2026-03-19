import { Session } from '../entities/session.entity';

export abstract class SessionRepository {
  abstract create(session: {
    id: string;
    userId: string;
    refreshToken: string;
  }): Promise<Session>;

  abstract findById(id: string): Promise<Session | null>;

  abstract updateOnRefresh(id: string): Promise<void>;

  abstract updateLastActivity(id: string): Promise<void>;

  abstract deactivate(id: string): Promise<void>;
}
