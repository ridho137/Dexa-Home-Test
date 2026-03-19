import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthGrpcClient } from './auth/auth-grpc.client';
import { JwtAccessGuard } from './auth/jwt-access.guard';
import { AuthGatewayController } from './auth/auth-gateway.controller';
import { AuthHttpService } from './auth/auth-http.service';
import { env } from './config/env';
import { AppLogger } from './infrastructure/logger/app-logger.service';
import { ProxyController } from './proxy/proxy.controller';
import { ProxyService } from './proxy/proxy.service';

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
  controllers: [AppController, AuthGatewayController, ProxyController],
  providers: [
    AppService,
    AuthGrpcClient,
    JwtAccessGuard,
    AuthHttpService,
    ProxyService,
    AppLogger,
  ],
})
export class AppModule {}
