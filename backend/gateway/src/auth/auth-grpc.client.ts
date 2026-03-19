import { Inject, Injectable } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AppLogger } from '../infrastructure/logger/app-logger.service';

interface CheckTokenRequest {
  token: string;
}

interface CheckTokenResponse {
  valid: boolean;
  userId?: string;
  sessionId?: string;
  email?: string;
  role?: string;
  errorCode?: string;
}

interface AuthGrpcService {
  CheckAccessToken(data: CheckTokenRequest): any;
  CheckRefreshToken(data: CheckTokenRequest): any;
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

  checkAccessToken(token: string): Promise<CheckTokenResponse> {
    this.logger.debug('AuthGrpcClient: checking access token');
    return firstValueFrom(this.service.CheckAccessToken({ token }));
  }

  checkRefreshToken(token: string): Promise<CheckTokenResponse> {
    this.logger.debug('AuthGrpcClient: checking refresh token');
    return firstValueFrom(this.service.CheckRefreshToken({ token }));
  }
}
