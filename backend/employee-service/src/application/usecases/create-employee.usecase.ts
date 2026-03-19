import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { AuthGrpcClient } from '../../infrastructure/grpc/auth-grpc.client';

@Injectable()
export class CreateEmployeeUseCase {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly authGrpc: AuthGrpcClient,
    private readonly logger: AppLogger,
  ) {}

  async execute(payload: {
    name: string;
    email: string;
    password: string;
    position: string;
    role?: 'EMPLOYEE' | 'ADMIN_HR';
    phoneNumber?: string | null;
  }) {
    const id = randomUUID();
    const role = payload.role ?? 'EMPLOYEE';

    const authResult = await this.authGrpc.createUser(
      id,
      payload.email,
      payload.password,
      role,
    );
    if (!authResult.success) {
      if (authResult.errorCode === 'EMAIL_ALREADY_EXISTS') {
        this.logger.warn('CreateEmployeeUseCase: auth email already exists', {
          email: payload.email,
        });
        throw new ConflictException('EMAIL_ALREADY_EXISTS');
      }
      if (authResult.errorCode === 'WEAK_PASSWORD') {
        this.logger.warn(
          'CreateEmployeeUseCase: weak password rejected by auth',
        );
        throw new BadRequestException('WEAK_PASSWORD');
      }
      this.logger.error('CreateEmployeeUseCase: auth create user failed', {
        errorCode: authResult.errorCode,
      });
      throw new InternalServerErrorException('EMPLOYEE_CREATE_FAILED');
    }

    try {
      const created = await this.employees.create({
        id,
        name: payload.name,
        email: payload.email,
        position: payload.position,
        role,
        phoneNumber: payload.phoneNumber,
      });
      this.logger.debug('CreateEmployeeUseCase: employee created', {
        id: created.id,
        email: created.email,
      });
      return created;
    } catch (err) {
      if (err?.code === '23505') {
        this.logger.warn('CreateEmployeeUseCase: duplicate email', {
          email: payload.email,
        });
        throw new ConflictException('EMAIL_ALREADY_EXISTS');
      }
      this.logger.error('CreateEmployeeUseCase: repository error', {
        payload: { id, email: payload.email },
        err,
      });
      throw new InternalServerErrorException('EMPLOYEE_CREATE_FAILED');
    }
  }
}
