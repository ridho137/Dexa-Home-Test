import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminRoleGuard } from './admin-role.guard';
import { CreateEmployeeUseCase } from '../../application/usecases/create-employee.usecase';
import { ListEmployeesUseCase } from '../../application/usecases/list-employees.usecase';
import { GetEmployeeByIdUseCase } from '../../application/usecases/get-employee-by-id.usecase';
import { UpdateEmployeeUseCase } from '../../application/usecases/update-employee.usecase';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import {
  ListEmployeesQueryDto,
  toListFilters,
} from './dto/list-employees-query.dto';

@Controller('employees/admin')
export class AdminEmployeeController {
  constructor(
    private readonly logger: AppLogger,
    private readonly createEmployeeUseCase: CreateEmployeeUseCase,
    private readonly listEmployeesUseCase: ListEmployeesUseCase,
    private readonly getEmployeeByIdUseCase: GetEmployeeByIdUseCase,
    private readonly updateEmployeeUseCase: UpdateEmployeeUseCase,
  ) {}

  @Post()
  @UseGuards(AdminRoleGuard)
  async createEmployee(@Body() body: CreateEmployeeDto) {
    this.logger.debug('AdminEmployeeController: createEmployee called');
    const created = await this.createEmployeeUseCase.execute({
      name: body.name,
      email: body.email,
      password: body.password,
      position: body.position,
      role: body.role,
      phoneNumber: body.phoneNumber,
    });
    return created;
  }

  @Get()
  @UseGuards(AdminRoleGuard)
  async listEmployees(@Query() query: ListEmployeesQueryDto) {
    this.logger.debug('AdminEmployeeController: listEmployees called', {
      page: query.page,
      limit: query.limit,
      role: query.role,
      search: query.search,
    });
    const filters = toListFilters(query);
    return this.listEmployeesUseCase.execute(filters);
  }

  @Get(':id')
  @UseGuards(AdminRoleGuard)
  async getEmployeeById(@Param('id') id: string) {
    this.logger.debug('AdminEmployeeController: getEmployeeById called', {
      id,
    });
    return this.getEmployeeByIdUseCase.execute(id);
  }

  @Patch(':id')
  @UseGuards(AdminRoleGuard)
  async updateEmployee(
    @Param('id') id: string,
    @Body() body: UpdateEmployeeDto,
  ) {
    this.logger.debug('AdminEmployeeController: updateEmployee called', { id });
    const updated = await this.updateEmployeeUseCase.execute(id, {
      name: body.name,
      position: body.position,
      phoneNumber: body.phoneNumber,
    });
    return updated;
  }
}
