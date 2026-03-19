import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UserRepository } from '../../domain/repositories/user.repository';
import { PasswordHasher } from '../../domain/services/password-hasher.service';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

export type CreateUserErrorCode = 'EMAIL_ALREADY_EXISTS' | 'WEAK_PASSWORD';

export interface CreateUserResult {
  success: boolean;
  errorCode?: CreateUserErrorCode;
}

const PASSWORD_POLICY_REGEX = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,}/;

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly logger: AppLogger,
  ) {}

  async execute(
    userId: string,
    email: string,
    password: string,
    role: 'EMPLOYEE' | 'ADMIN_HR',
  ): Promise<CreateUserResult> {
    let existing;
    try {
      existing = await this.users.findByEmail(email);
    } catch (err) {
      this.logger.error('CreateUserUseCase: find by email error', {
        email,
        err,
      });
      throw new InternalServerErrorException('AUTH_CREATE_USER_FAILED');
    }

    if (existing) {
      this.logger.warn('CreateUserUseCase: email already exists', { email });
      return { success: false, errorCode: 'EMAIL_ALREADY_EXISTS' };
    }

    if (!PASSWORD_POLICY_REGEX.test(password)) {
      this.logger.warn('CreateUserUseCase: weak password', { userId });
      return { success: false, errorCode: 'WEAK_PASSWORD' };
    }

    let passwordHash: string;
    try {
      passwordHash = await this.hasher.hash(password);
    } catch (err) {
      this.logger.error('CreateUserUseCase: hash error', { userId, err });
      throw new InternalServerErrorException('AUTH_CREATE_USER_FAILED');
    }

    try {
      await this.users.create({
        id: userId,
        email,
        passwordHash,
        role,
      });
    } catch (err) {
      if (err?.code === '23505') {
        this.logger.warn('CreateUserUseCase: duplicate email on insert', {
          email,
        });
        return { success: false, errorCode: 'EMAIL_ALREADY_EXISTS' };
      }
      this.logger.error('CreateUserUseCase: create error', {
        userId,
        email,
        err,
      });
      throw new InternalServerErrorException('AUTH_CREATE_USER_FAILED');
    }

    this.logger.debug('CreateUserUseCase: user created', { userId, email });
    return { success: true };
  }
}
