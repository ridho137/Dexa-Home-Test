import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

interface GetEmployeeRequest {
  id: string;
}

interface GetEmployeeResponse {
  found: boolean;
  isActive: boolean;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

@Controller()
export class EmployeeGrpcController {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly logger: AppLogger,
  ) {}

  @GrpcMethod('EmployeeGrpc', 'GetEmployee')
  async getEmployee(data: GetEmployeeRequest): Promise<GetEmployeeResponse> {
    const { id } = data;
    try {
      const emp = await this.employees.findById(id);
      if (!emp) {
        this.logger.warn('EmployeeGrpcController: employee not found', { id });
        return { found: false, isActive: false };
      }
      return {
        found: true,
        isActive: emp.isActive,
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
      };
    } catch (err) {
      this.logger.error('EmployeeGrpcController: repository error', {
        id,
        err,
      });
      // For internal errors, just mark as not found/inactive to caller,
      // they will treat this as failure if needed.
      return { found: false, isActive: false };
    }
  }
}
