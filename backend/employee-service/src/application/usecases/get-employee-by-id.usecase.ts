import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { Employee } from '../../domain/entities/employee.entity';

@Injectable()
export class GetEmployeeByIdUseCase {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly logger: AppLogger,
  ) {}

  async execute(id: string): Promise<Employee> {
    let employee: Employee | null;
    try {
      employee = await this.employees.findById(id);
    } catch (err) {
      this.logger.error('GetEmployeeByIdUseCase: repository error', {
        id,
        err,
      });
      throw new InternalServerErrorException('EMPLOYEE_LOOKUP_FAILED');
    }

    if (!employee) {
      this.logger.warn('GetEmployeeByIdUseCase: employee not found', { id });
      throw new NotFoundException('EMPLOYEE_NOT_FOUND');
    }

    this.logger.debug('GetEmployeeByIdUseCase: employee loaded', {
      id,
      email: employee.email,
      role: employee.role,
    });

    return employee;
  }
}
