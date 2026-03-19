import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CreateAttendanceUseCase } from '../../application/usecases/create-attendance.usecase';
import { ListMyAttendanceUseCase } from '../../application/usecases/list-my-attendance.usecase';
import { GetTodayAttendanceStatusUseCase } from '../../application/usecases/get-today-attendance-status.usecase';
import type { RequestWithUser } from './credentials.middleware';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { ListMyAttendanceQueryDto } from './dto/list-my-attendance-query.dto';
import { ListAdminAttendanceUseCase } from '../../application/usecases/list-admin-attendance.usecase';
import { ListAdminAttendanceQueryDto } from './dto/list-admin-attendance-query.dto';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { AdminRoleGuard } from './admin-role.guard';

@Controller('attendances')
export class AttendanceController {
  constructor(
    private readonly createAttendanceUseCase: CreateAttendanceUseCase,
    private readonly listMyAttendanceUseCase: ListMyAttendanceUseCase,
    private readonly getTodayStatusUseCase: GetTodayAttendanceStatusUseCase,
    private readonly listAdminAttendanceUseCase: ListAdminAttendanceUseCase,
    private readonly logger: AppLogger,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: RequestWithUser, @Body() body: CreateAttendanceDto) {
    const userId = req.user?.userId;
    this.logger.debug('AttendanceController: create called', {
      userId,
      status: body.status,
    });
    const attendance = await this.createAttendanceUseCase.execute(
      userId!,
      body.status,
    );
    return attendance;
  }

  @Get('me')
  async listMy(
    @Req() req: RequestWithUser,
    @Query() query: ListMyAttendanceQueryDto,
  ) {
    const userId = req.user?.userId!;

    const parseYMD = (value: string): Date => {
      const [yyyy, mm, dd] = value.split('-').map(Number);
      return new Date(Date.UTC(yyyy, mm - 1, dd));
    };

    // Default: start of current month -> today (UTC date boundaries)
    const now = new Date();
    const startDefault = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const endDefault = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const startDate = query.startDate
      ? parseYMD(query.startDate)
      : startDefault;
    const endDate = query.endDate ? parseYMD(query.endDate) : endDefault;

    this.logger.debug('AttendanceController: listMy called', {
      userId,
      page: query.page,
      limit: query.limit,
      startDate: query.startDate,
      endDate: query.endDate,
    });
    return this.listMyAttendanceUseCase.execute({
      employeeId: userId,
      startDate,
      endDate,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }

  @Get('me/today')
  async getToday(@Req() req: RequestWithUser) {
    const userId = req.user?.userId!;
    this.logger.debug('AttendanceController: getToday called', { userId });
    return this.getTodayStatusUseCase.execute(userId);
  }

  @Get('admin')
  @UseGuards(AdminRoleGuard)
  async listAdmin(@Query() query: ListAdminAttendanceQueryDto) {
    const parseYMD = (value: string): Date => {
      const [yyyy, mm, dd] = value.split('-').map(Number);
      // Use local date boundaries to match DATE comparisons in PostgreSQL.
      return new Date(yyyy, mm - 1, dd);
    };

    // Default: start of current month -> today (local date boundaries)
    const now = new Date();
    const startDefault = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDefault = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const startDate = query.startDate
      ? parseYMD(query.startDate)
      : startDefault;
    const endDate = query.endDate ? parseYMD(query.endDate) : endDefault;

    return this.listAdminAttendanceUseCase.execute({
      startDate,
      endDate,
      employeeId: query.employeeId ?? null,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }
}
