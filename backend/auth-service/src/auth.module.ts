import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './presentation/http/auth.controller';
import { AuthGrpcController } from './presentation/grpc/auth-grpc.controller';
import { LoginUseCase } from './application/usecases/login.usecase';
import { RefreshTokenUseCase } from './application/usecases/refresh-token.usecase';
import { LogoutUseCase } from './application/usecases/logout.usecase';
import { ChangePasswordUseCase } from './application/usecases/change-password.usecase';
import { CreateUserUseCase } from './application/usecases/create-user.usecase';
import { PgUserRepository } from './infrastructure/repositories/pg-user.repository';
import { BcryptPasswordHasher } from './infrastructure/services/bcrypt-password-hasher.service';
import { UserRepository } from './domain/repositories/user.repository';
import { PasswordHasher } from './domain/services/password-hasher.service';
import { SessionRepository } from './domain/repositories/session.repository';
import { PgSessionRepository } from './infrastructure/repositories/pg-session.repository';
import { AppLogger } from './infrastructure/logger/app-logger.service';
import { env } from './config/env';
import { GatewayAuthMiddleware } from './presentation/http/gateway-auth.middleware';

@Module({
  imports: [
    JwtModule.register({
      secret: env.jwt.secret,
      signOptions: { expiresIn: env.jwt.expiresIn as any },
    }),
  ],
  controllers: [AuthController, AuthGrpcController],
  providers: [
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    ChangePasswordUseCase,
    CreateUserUseCase,
    AppLogger,
    { provide: UserRepository, useClass: PgUserRepository },
    { provide: PasswordHasher, useClass: BcryptPasswordHasher },
    { provide: SessionRepository, useClass: PgSessionRepository },
  ],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(GatewayAuthMiddleware).forRoutes('auth');
  }
}
