import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UserRepository } from '../../domain/repositories/user.repository';
import { PasswordHasher } from '../../domain/services/password-hasher.service';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

export type ChangePasswordErrorCode =
  | 'INVALID_OLD_PASSWORD'
  | 'WEAK_PASSWORD'
  | 'USER_INACTIVE';

export interface ChangePasswordResult {
  success: boolean;
  errorCode?: ChangePasswordErrorCode;
}

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly logger: AppLogger,
  ) {}

  async execute(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<ChangePasswordResult> {
    let user;
    try {
      user = await this.users.findById(userId);
    } catch (err) {
      this.logger.error('ChangePasswordUseCase: user repository error', {
        userId,
        err,
      });
      throw new InternalServerErrorException('AUTH_CHANGE_PASSWORD_FAILED');
    }

    if (!user || !user.isActive) {
      this.logger.warn(
        'ChangePasswordUseCase: inactive or missing user for change password',
        { userId },
      );
      return { success: false, errorCode: 'USER_INACTIVE' };
    }

    // Verify old password
    let oldPasswordOk: boolean;
    try {
      oldPasswordOk = await this.hasher.compare(oldPassword, user.passwordHash);
    } catch (err) {
      this.logger.error('ChangePasswordUseCase: password compare error', {
        userId,
        err,
      });
      throw new InternalServerErrorException('AUTH_CHANGE_PASSWORD_FAILED');
    }

    if (!oldPasswordOk) {
      this.logger.warn('ChangePasswordUseCase: invalid old password', {
        userId,
      });
      return { success: false, errorCode: 'INVALID_OLD_PASSWORD' };
    }

    // Basic password policy check – frontend and DTO already enforce,
    // but we keep a minimal guardrail here.
    const policyRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,}/;
    if (!policyRegex.test(newPassword)) {
      this.logger.warn('ChangePasswordUseCase: weak new password', {
        userId,
      });
      return { success: false, errorCode: 'WEAK_PASSWORD' };
    }

    // Hash and persist new password
    let newHash: string;
    try {
      newHash = await this.hasher.hash(newPassword);
    } catch (err) {
      this.logger.error('ChangePasswordUseCase: hash error', {
        userId,
        err,
      });
      throw new InternalServerErrorException('AUTH_CHANGE_PASSWORD_FAILED');
    }

    try {
      await this.users.updatePassword(userId, newHash);
    } catch (err) {
      this.logger.error('ChangePasswordUseCase: update error', {
        userId,
        err,
      });
      throw new InternalServerErrorException('AUTH_CHANGE_PASSWORD_FAILED');
    }

    this.logger.debug('ChangePasswordUseCase: password updated', { userId });
    return { success: true };
  }
}
