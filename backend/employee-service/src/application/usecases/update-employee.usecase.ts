import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

@Injectable()
export class UpdateEmployeeUseCase {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly logger: AppLogger,
  ) {}

  async execute(
    id: string,
    payload: {
      name?: string;
      position?: string;
      phoneNumber?: string | null;
    },
  ) {
    let existing;
    try {
      existing = await this.employees.findById(id);
    } catch (err) {
      this.logger.error('UpdateEmployeeUseCase: repository lookup error', {
        id,
        err,
      });
      throw new InternalServerErrorException('EMPLOYEE_LOOKUP_FAILED');
    }

    if (!existing) {
      this.logger.warn('UpdateEmployeeUseCase: employee not found', { id });
      throw new NotFoundException('EMPLOYEE_NOT_FOUND');
    }

    const finalName =
      payload.name === undefined || payload.name === ''
        ? existing.name
        : payload.name;

    const finalPosition =
      payload.position === undefined || payload.position === ''
        ? existing.position
        : payload.position;

    const finalPhoneNumber =
      payload.phoneNumber === undefined || payload.phoneNumber === ''
        ? existing.phoneNumber
        : payload.phoneNumber;

    let updated;
    this.logger.debug('UpdateEmployeeUseCase: updating employee', {
      id,
      finalName,
      finalPosition,
      finalPhoneNumber,
    });
    try {
      updated = await this.employees.adminUpdate(id, {
        name: finalName,
        position: finalPosition,
        phoneNumber: finalPhoneNumber,
      });
    } catch (err) {
      this.logger.error('UpdateEmployeeUseCase: repository update error', {
        id,
        err,
      });
      throw new InternalServerErrorException('EMPLOYEE_UPDATE_FAILED');
    }
    this.logger.debug('UpdateEmployeeUseCase: employee updated', { id });
    return updated;
  }
}
