import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { S3StorageService } from '../../infrastructure/services/s3-storage.service';
import { NotificationRabbitMqPublisher } from '../../infrastructure/rabbitmq/notification-rabbitmq.publisher';

@Injectable()
export class UpdateMyProfileUseCase {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly logger: AppLogger,
    private readonly storage: S3StorageService,
    private readonly notificationPublisher: NotificationRabbitMqPublisher,
  ) {}

  async execute(
    userId: string,
    payload: { phoneNumber?: string | null; photoUrl?: string | null },
    file?: { buffer: Buffer; mimetype: string; originalName: string },
  ) {
    // Load existing employee to support proper PATCH semantics and 404 when missing.
    let existing;
    try {
      existing = await this.employees.findById(userId);
    } catch (err) {
      this.logger.error('UpdateMyProfileUseCase: repository lookup error', {
        userId,
        err,
      });
      throw new InternalServerErrorException('EMPLOYEE_LOOKUP_FAILED');
    }

    if (!existing) {
      this.logger.warn('UpdateMyProfileUseCase: employee not found', {
        userId,
      });
      throw new NotFoundException('EMPLOYEE_NOT_FOUND');
    }

    // Decide final phone number: if not provided or empty, keep existing.
    const finalPhoneNumber =
      payload.phoneNumber === undefined || payload.phoneNumber === ''
        ? existing.phoneNumber
        : payload.phoneNumber;

    // Decide final photoUrl:
    // - if new file uploaded: upload first, then use new S3 URL
    // - else if explicit photoUrl provided and not empty: use it
    // - else keep existing
    let photoUrl = existing.photoUrl;
    if (file && userId) {
      const key = `profile/${userId}`;
      await this.storage.uploadObject(key, file.buffer, file.mimetype);
      photoUrl = this.storage.buildPublicUrl(key);
    } else if (payload.photoUrl !== undefined && payload.photoUrl !== '') {
      photoUrl = payload.photoUrl;
    }

    const phoneChanged =
      payload.phoneNumber !== undefined && payload.phoneNumber !== '';

    const photoChanged =
      !!file || (payload.photoUrl !== undefined && payload.photoUrl !== '');

    let updated;
    try {
      updated = await this.employees.updateProfile(userId, {
        phoneNumber: finalPhoneNumber ?? null,
        photoUrl,
      });
    } catch (err: any) {
      if (err instanceof Error && err.message === 'EMPLOYEE_NOT_FOUND') {
        this.logger.warn('UpdateMyProfileUseCase: employee not found', {
          userId,
        });
        throw new NotFoundException('EMPLOYEE_NOT_FOUND');
      }
      this.logger.error('UpdateMyProfileUseCase: repository error', {
        userId,
        err,
      });
      throw new InternalServerErrorException('EMPLOYEE_UPDATE_FAILED');
    }

    this.logger.debug('UpdateMyProfileUseCase: profile updated', {
      userId,
    });

    await this.notificationPublisher.publish({
      type: 'EMPLOYEE_UPDATED',
      actorUserId: updated.id,
      actorEmail: updated.email,
      actorRole: updated.role,
      occurredAtIso: new Date().toISOString(),
      meta: {
        phoneNumberChanged: phoneChanged,
        photoChanged,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      position: updated.position,
      phoneNumber: updated.phoneNumber,
      photoUrl: updated.photoUrl,
      isActive: updated.isActive,
    };
  }
}
