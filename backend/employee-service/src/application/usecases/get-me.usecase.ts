import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

@Injectable()
export class GetMeUseCase {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly logger: AppLogger,
  ) {}

  async execute(userId: string) {
    let employee;
    try {
      employee = await this.employees.findById(userId);
    } catch (err) {
      this.logger.error('GetMeUseCase: repository error', { userId, err });
      throw new InternalServerErrorException('EMPLOYEE_LOOKUP_FAILED');
    }
    if (!employee) {
      this.logger.warn('GetMeUseCase: employee not found', { userId });
      throw new NotFoundException('EMPLOYEE_NOT_FOUND');
    }

    this.logger.debug('GetMeUseCase: profile loaded', { userId });

    return {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      position: employee.position,
      phoneNumber: employee.phoneNumber,
      photoUrl: employee.photoUrl,
      isActive: employee.isActive,
    };
  }
}
