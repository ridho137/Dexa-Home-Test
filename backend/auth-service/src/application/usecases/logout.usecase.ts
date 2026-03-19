import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly logger: AppLogger,
  ) {}

  async execute(sessionId: string): Promise<void> {
    let session;
    try {
      session = await this.sessions.findById(sessionId);
    } catch (err) {
      this.logger.error('LogoutUseCase: session repository error', {
        sessionId,
        err,
      });
      throw new InternalServerErrorException('AUTH_LOGOUT_FAILED');
    }
    if (!session || !session.isActive) {
      this.logger.warn(
        `LogoutUseCase: inactive or missing session ${sessionId} (from gateway)`,
      );
      throw new UnauthorizedException('SESSION_INACTIVE');
    }

    try {
      await this.sessions.deactivate(sessionId);
    } catch (err) {
      this.logger.error('LogoutUseCase: session deactivate error', {
        sessionId,
        err,
      });
      throw new InternalServerErrorException('AUTH_LOGOUT_FAILED');
    }
    this.logger.debug(
      `LogoutUseCase: deactivated session ${sessionId} (from gateway)`,
    );
  }
}
