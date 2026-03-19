import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  EmployeeRepository,
  ListEmployeesFilters,
  ListEmployeesResult,
} from '../../domain/repositories/employee.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

@Injectable()
export class ListEmployeesUseCase {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly logger: AppLogger,
  ) {}

  async execute(filters: ListEmployeesFilters): Promise<ListEmployeesResult> {
    let result: ListEmployeesResult;
    try {
      result = await this.employees.findWithFilters(filters);
    } catch (err) {
      this.logger.error('ListEmployeesUseCase: repository error', { err });
      throw new InternalServerErrorException('EMPLOYEE_LIST_FAILED');
    }
    this.logger.debug('ListEmployeesUseCase: employees listed', {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
    return result;
  }
}
