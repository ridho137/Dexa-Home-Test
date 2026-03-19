import { Inject, Injectable } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AppLogger } from '../logger/app-logger.service';

interface ChangePasswordRequest {
  userId: string;
  oldPassword: string;
  newPassword: string;
}

interface ChangePasswordResponse {
  success: boolean;
  errorCode?: string;
}

interface CreateUserRequest {
  userId: string;
  email: string;
  password: string;
  role: string;
}

interface CreateUserResponse {
  success: boolean;
  errorCode?: string;
}

interface AuthGrpcService {
  ChangePassword(data: ChangePasswordRequest): any;
  CreateUser(data: CreateUserRequest): any;
}

@Injectable()
export class AuthGrpcClient {
  private service: AuthGrpcService;

  constructor(
    @Inject('AUTH_GRPC_CLIENT') private readonly client: ClientGrpc,
    private readonly logger: AppLogger,
  ) {}

  onModuleInit() {
    this.service = this.client.getService<AuthGrpcService>('AuthGrpc');
  }

  changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<ChangePasswordResponse> {
    this.logger.debug('AuthGrpcClient (employee): changing password', {
      userId,
    });
    return firstValueFrom(
      this.service.ChangePassword({ userId, oldPassword, newPassword }),
    );
  }

  createUser(
    userId: string,
    email: string,
    password: string,
    role: string,
  ): Promise<CreateUserResponse> {
    this.logger.debug('AuthGrpcClient (employee): create user', { userId });
    return firstValueFrom(
      this.service.CreateUser({ userId, email, password, role }),
    );
  }
}
