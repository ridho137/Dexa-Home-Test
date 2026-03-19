import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { env } from '../../config/env';
import { ChangePasswordUseCase } from '../../application/usecases/change-password.usecase';
import { CreateUserUseCase } from '../../application/usecases/create-user.usecase';

interface CheckTokenRequest {
  token: string;
}

interface CheckTokenResponse {
  valid: boolean;
  userId?: string;
  sessionId?: string;
  email?: string;
  role?: string;
  errorCode?: string;
}

interface ChangePasswordRequest {
  userId: string;
  oldPassword: string;
  newPassword: string;
}

interface ChangePasswordResponse {
  success: boolean;
  errorCode?: string;
}

interface CreateUserRequest {
  userId: string;
  email: string;
  password: string;
  role: string;
}

interface CreateUserResponse {
  success: boolean;
  errorCode?: string;
}

@Controller()
export class AuthGrpcController {
  constructor(
    private readonly jwt: JwtService,
    private readonly sessions: SessionRepository,
    private readonly users: UserRepository,
    private readonly logger: AppLogger,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
  ) {}

  @GrpcMethod('AuthGrpc', 'CheckAccessToken')
  async checkAccessToken(data: CheckTokenRequest): Promise<CheckTokenResponse> {
    const { token } = data;
    try {
      const payload: any = await this.jwt.verifyAsync(token, {
        secret: env.jwt.secret,
      });

      const sessionId = payload.sid;
      if (!sessionId) {
        return { valid: false, errorCode: 'MISSING_SESSION_ID' };
      }

      const session = await this.sessions.findById(sessionId);
      if (!session || !session.isActive) {
        return { valid: false, errorCode: 'SESSION_INACTIVE' };
      }

      const user = await this.users.findById(payload.sub);
      if (!user || !user.isActive) {
        return { valid: false, errorCode: 'USER_INACTIVE' };
      }

      await this.sessions.updateLastActivity(sessionId);

      return {
        valid: true,
        userId: user.id,
        sessionId,
        email: user.email,
        role: user.role,
      };
    } catch (err) {
      this.logger.warn('AuthGrpcController: invalid access token', err);
      return { valid: false, errorCode: 'INVALID_ACCESS_TOKEN' };
    }
  }

  @GrpcMethod('AuthGrpc', 'CheckRefreshToken')
  async checkRefreshToken(
    data: CheckTokenRequest,
  ): Promise<CheckTokenResponse> {
    const { token } = data;
    try {
      const payload: any = await this.jwt.verifyAsync(token, {
        secret: env.jwt.refreshSecret,
      });

      if (payload.tokenType !== 'refresh') {
        return { valid: false, errorCode: 'INVALID_TOKEN_TYPE' };
      }

      const sessionId = payload.sid;
      if (!sessionId) {
        return { valid: false, errorCode: 'MISSING_SESSION_ID' };
      }

      const session = await this.sessions.findById(sessionId);
      if (!session || !session.isActive) {
        return { valid: false, errorCode: 'SESSION_INACTIVE' };
      }

      const user = await this.users.findById(payload.sub);
      if (!user || !user.isActive) {
        return { valid: false, errorCode: 'USER_INACTIVE' };
      }

      return {
        valid: true,
        userId: user.id,
        sessionId,
        email: user.email,
        role: user.role,
      };
    } catch (err) {
      this.logger.warn('AuthGrpcController: invalid refresh token', err);
      return { valid: false, errorCode: 'INVALID_REFRESH_TOKEN' };
    }
  }

  @GrpcMethod('AuthGrpc', 'ChangePassword')
  async changePassword(
    data: ChangePasswordRequest,
  ): Promise<ChangePasswordResponse> {
    const { userId, oldPassword, newPassword } = data;
    this.logger.debug('AuthGrpcController: ChangePassword called', { userId });

    try {
      const result = await this.changePasswordUseCase.execute(
        userId,
        oldPassword,
        newPassword,
      );

      return {
        success: result.success,
        errorCode: result.errorCode,
      };
    } catch {
      return {
        success: false,
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  @GrpcMethod('AuthGrpc', 'CreateUser')
  async createUser(data: CreateUserRequest): Promise<CreateUserResponse> {
    const { userId, email, password, role } = data;
    this.logger.debug('AuthGrpcController: CreateUser called', {
      userId,
      email,
    });

    const roleVal = role === 'ADMIN_HR' ? 'ADMIN_HR' : 'EMPLOYEE';
    try {
      const result = await this.createUserUseCase.execute(
        userId,
        email,
        password,
        roleVal,
      );
      return {
        success: result.success,
        errorCode: result.errorCode,
      };
    } catch {
      return {
        success: false,
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }
}
