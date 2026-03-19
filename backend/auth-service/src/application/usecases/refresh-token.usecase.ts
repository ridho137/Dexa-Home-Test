import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { env } from '../../config/env';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly users: UserRepository,
    private readonly jwt: JwtService,
    private readonly logger: AppLogger,
  ) {}

  async execute(
    sessionId: string,
    userId: string,
  ): Promise<{ accessToken: string }> {
    let session;
    try {
      session = await this.sessions.findById(sessionId);
    } catch (err) {
      this.logger.error('RefreshTokenUseCase: session repository error', {
        sessionId,
        err,
      });
      throw new InternalServerErrorException('AUTH_REFRESH_FAILED');
    }
    if (!session || !session.isActive) {
      this.logger.warn(
        `RefreshTokenUseCase: inactive or missing session ${sessionId} (from gateway)`,
      );
      throw new UnauthorizedException('SESSION_INACTIVE');
    }

    let user;
    try {
      user = await this.users.findById(userId);
    } catch (err) {
      this.logger.error('RefreshTokenUseCase: user repository error', {
        userId,
        err,
      });
      throw new InternalServerErrorException('AUTH_REFRESH_FAILED');
    }

    if (!user || !user.isActive) {
      this.logger.warn(
        `RefreshTokenUseCase: inactive or missing user for id ${userId} (from gateway)`,
      );
      throw new UnauthorizedException('USER_INACTIVE');
    }

    const newAccessPayload = {
      sub: user.id,
      sid: session.id,
      email: user.email,
      role: user.role,
    };

    let newAccessToken: string;
    try {
      newAccessToken = await this.jwt.signAsync(newAccessPayload, {
        secret: env.jwt.secret,
        expiresIn: env.jwt.expiresIn as any,
      });
    } catch (err) {
      this.logger.error('RefreshTokenUseCase: jwt sign error', {
        sessionId,
        userId,
        err,
      });
      throw new InternalServerErrorException('AUTH_REFRESH_FAILED');
    }

    try {
      await this.sessions.updateOnRefresh(session.id);
    } catch (err) {
      this.logger.error('RefreshTokenUseCase: session update error', {
        sessionId: session.id,
        err,
      });
      throw new InternalServerErrorException('AUTH_REFRESH_FAILED');
    }

    this.logger.debug(
      `RefreshTokenUseCase: issued new access token for session ${session.id} (from gateway)`,
    );

    return {
      accessToken: newAccessToken,
    };
  }
}
