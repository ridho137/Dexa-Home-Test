import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { AuthGrpcClient } from '../../infrastructure/grpc/auth-grpc.client';
import { NotificationRabbitMqPublisher } from '../../infrastructure/rabbitmq/notification-rabbitmq.publisher';

@Injectable()
export class ChangeMyPasswordUseCase {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly authGrpc: AuthGrpcClient,
    private readonly logger: AppLogger,
    private readonly notificationPublisher: NotificationRabbitMqPublisher,
  ) {}

  async execute(
    userId: string,
    payload: { oldPassword: string; newPassword: string },
  ): Promise<void> {
    this.logger.debug('ChangeMyPasswordUseCase: change password requested', {
      userId,
    });

    // Ensure employee exists (defensive check)
    let employee;
    try {
      employee = await this.employees.findById(userId);
      if (!employee) {
        this.logger.warn(
          'ChangeMyPasswordUseCase: employee not found for user',
          { userId },
        );
        throw new UnauthorizedException('EMPLOYEE_NOT_FOUND');
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error('ChangeMyPasswordUseCase: employee repository error', {
        userId,
        err,
      });
      throw new InternalServerErrorException('EMPLOYEE_LOOKUP_FAILED');
    }

    // Call Auth-service via gRPC ChangePassword RPC
    let res;
    try {
      res = await this.authGrpc.changePassword(
        userId,
        payload.oldPassword,
        payload.newPassword,
      );
    } catch (err) {
      this.logger.error('ChangeMyPasswordUseCase: gRPC changePassword error', {
        userId,
        err,
      });
      throw new InternalServerErrorException('AUTH_CHANGE_PASSWORD_FAILED');
    }

    if (!res.success) {
      switch (res.errorCode) {
        case 'INVALID_OLD_PASSWORD':
          throw new BadRequestException('INVALID_OLD_PASSWORD');
        case 'WEAK_PASSWORD':
          throw new BadRequestException('WEAK_PASSWORD');
        case 'USER_INACTIVE':
          throw new UnauthorizedException('USER_INACTIVE');
        default:
          this.logger.error(
            'ChangeMyPasswordUseCase: unexpected errorCode from auth-service',
            { userId, errorCode: res.errorCode },
          );
          throw new InternalServerErrorException('AUTH_CHANGE_PASSWORD_FAILED');
      }
    }

    this.logger.debug('ChangeMyPasswordUseCase: password changed', { userId });

    await this.notificationPublisher.publish({
      type: 'EMPLOYEE_PASSWORD_CHANGED',
      actorUserId: employee.id,
      actorEmail: employee.email,
      actorRole: employee.role,
      occurredAtIso: new Date().toISOString(),
      meta: {},
    });
  }
}
