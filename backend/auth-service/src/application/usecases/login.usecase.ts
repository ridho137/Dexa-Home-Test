import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository';
import { PasswordHasher } from '../../domain/services/password-hasher.service';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { env } from '../../config/env';

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
  }
}

export interface LoginCommand {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly jwt: JwtService,
    private readonly sessions: SessionRepository,
    private readonly logger: AppLogger,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    this.logger.debug(`LoginUseCase: login attempt for ${command.email}`);

    let user: User | null;
    try {
      user = await this.users.findByEmail(command.email);
    } catch (err) {
      this.logger.error('LoginUseCase: user repository error', {
        email: command.email,
        err,
      });
      throw new InternalServerErrorException('AUTH_LOGIN_FAILED');
    }

    if (!user || !user.isActive) {
      this.logger.warn(
        `LoginUseCase: user not found or inactive for ${command.email}`,
      );
      throw new InvalidCredentialsError();
    }

    let passwordOk: boolean;
    try {
      passwordOk = await this.hasher.compare(
        command.password,
        user.passwordHash,
      );
    } catch (err) {
      this.logger.error('LoginUseCase: password compare error', {
        email: command.email,
        err,
      });
      throw new InternalServerErrorException('AUTH_LOGIN_FAILED');
    }

    if (!passwordOk) {
      this.logger.warn(`LoginUseCase: invalid password for ${command.email}`);
      throw new InvalidCredentialsError();
    }

    const sessionId = randomUUID();

    const payload = {
      sub: user.id,
      sid: sessionId,
      email: user.email,
      role: user.role,
    };

    let accessToken: string;
    let refreshToken: string;
    try {
      accessToken = await this.jwt.signAsync(payload, {
        secret: env.jwt.secret,
        expiresIn: env.jwt.expiresIn as any,
      });

      refreshToken = await this.jwt.signAsync(
        { sub: user.id, sid: sessionId, tokenType: 'refresh' },
        {
          secret: env.jwt.refreshSecret,
          expiresIn: env.jwt.refreshExpiresIn as any,
        },
      );
    } catch (err) {
      this.logger.error('LoginUseCase: jwt sign error', {
        email: command.email,
        err,
      });
      throw new InternalServerErrorException('AUTH_LOGIN_FAILED');
    }

    try {
      await this.sessions.create({
        id: sessionId,
        userId: user.id,
        refreshToken,
      });
    } catch (err) {
      this.logger.error('LoginUseCase: session repository error', {
        email: command.email,
        sessionId,
        err,
      });
      throw new InternalServerErrorException('AUTH_LOGIN_FAILED');
    }

    this.logger.debug(
      `LoginUseCase: login success for ${command.email}, session ${sessionId}`,
    );

    return { accessToken, refreshToken };
  }
}
