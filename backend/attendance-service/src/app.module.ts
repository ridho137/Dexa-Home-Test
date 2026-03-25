import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { AppLogger } from './infrastructure/logger/app-logger.service';
import { AttendanceRepository } from './domain/repositories/attendance.repository';
import { PgAttendanceRepository } from './infrastructure/repositories/pg-attendance.repository';
import { AttendanceController } from './presentation/http/attendance.controller';
import { CredentialsMiddleware } from './presentation/http/credentials.middleware';
import { CreateAttendanceUseCase } from './application/usecases/create-attendance.usecase';
import { ListMyAttendanceUseCase } from './application/usecases/list-my-attendance.usecase';
import { GetTodayAttendanceStatusUseCase } from './application/usecases/get-today-attendance-status.usecase';
import { ListAdminAttendanceUseCase } from './application/usecases/list-admin-attendance.usecase';
import { env } from './config/env';
import { EmployeeGrpcClient } from './infrastructure/grpc/employee-grpc.client';
import { AttendanceAutoClockoutScheduler } from './schedulers/attendance-auto-clockout.scheduler';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ClientsModule.register([
      {
        name: 'EMPLOYEE_GRPC_CLIENT',
        transport: Transport.GRPC,
        options: {
          package: 'employee',
          protoPath: join(__dirname, '..', 'src/proto/employee.proto'),
          url: env.employeeGrpcUrl,
        },
      },
    ]),
  ],
  controllers: [AttendanceController],
  providers: [
    AppLogger,
    { provide: AttendanceRepository, useClass: PgAttendanceRepository },
    CreateAttendanceUseCase,
    ListMyAttendanceUseCase,
    GetTodayAttendanceStatusUseCase,
    ListAdminAttendanceUseCase,
    EmployeeGrpcClient,
    AttendanceAutoClockoutScheduler,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CredentialsMiddleware).forRoutes(AttendanceController);
  }
}
