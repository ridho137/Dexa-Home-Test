import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppLogger } from './infrastructure/logger/app-logger.service';
import { EmployeeRepository } from './domain/repositories/employee.repository';
import { PgEmployeeRepository } from './infrastructure/repositories/pg-employee.repository';
import { EmployeeController } from './presentation/http/employee.controller';
import { CredentialsMiddleware } from './presentation/http/credentials.middleware';
import { AdminEmployeeController } from './presentation/http/admin-employee.controller';
import { S3StorageService } from './infrastructure/services/s3-storage.service';
import { GetMeUseCase } from './application/usecases/get-me.usecase';
import { UpdateMyProfileUseCase } from './application/usecases/update-my-profile.usecase';
import { ChangeMyPasswordUseCase } from './application/usecases/change-my-password.usecase';
import { CreateEmployeeUseCase } from './application/usecases/create-employee.usecase';
import { ListEmployeesUseCase } from './application/usecases/list-employees.usecase';
import { GetEmployeeByIdUseCase } from './application/usecases/get-employee-by-id.usecase';
import { UpdateEmployeeUseCase } from './application/usecases/update-employee.usecase';
import { env } from './config/env';
import { AuthGrpcClient } from './infrastructure/grpc/auth-grpc.client';
import { EmployeeGrpcController } from './presentation/grpc/employee-grpc.controller';
import { NotificationRabbitMqPublisher } from './infrastructure/rabbitmq/notification-rabbitmq.publisher';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_GRPC_CLIENT',
        transport: Transport.GRPC,
        options: {
          package: 'auth',
          protoPath: join(__dirname, '..', 'src/proto/auth.proto'),
          url: env.authGrpcUrl,
        },
      },
    ]),
  ],
  controllers: [
    EmployeeController,
    AdminEmployeeController,
    EmployeeGrpcController,
  ],
  providers: [
    AppLogger,
    { provide: EmployeeRepository, useClass: PgEmployeeRepository },
    S3StorageService,
    NotificationRabbitMqPublisher,
    GetMeUseCase,
    UpdateMyProfileUseCase,
    ChangeMyPasswordUseCase,
    CreateEmployeeUseCase,
    ListEmployeesUseCase,
    GetEmployeeByIdUseCase,
    UpdateEmployeeUseCase,
    AuthGrpcClient,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CredentialsMiddleware)
      .forRoutes(EmployeeController, AdminEmployeeController);
  }
}
