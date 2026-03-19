import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGrpcClient } from './auth-grpc.client';
import { AppLogger } from '../infrastructure/logger/app-logger.service';

@Injectable()
export class JwtAccessGuard implements CanActivate {
  constructor(
    private readonly authGrpc: AuthGrpcClient,
    private readonly logger: AppLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization ?? '';
    const [, token] = authHeader.split(' ');

    if (!token) {
      this.logger.warn('JwtAccessGuard: missing access token');
      throw new UnauthorizedException('MISSING_ACCESS_TOKEN');
    }

    const res = await this.authGrpc.checkAccessToken(token);
    if (!res.valid) {
      this.logger.warn(
        `JwtAccessGuard: invalid access token, errorCode=${res.errorCode}`,
      );
      throw new UnauthorizedException(res.errorCode ?? 'INVALID_ACCESS_TOKEN');
    }

    (req as any).user = {
      id: res.userId,
      email: res.email,
      role: res.role,
      sessionId: res.sessionId,
    };

    this.logger.debug(
      `JwtAccessGuard: authorized user ${res.userId} with role ${res.role}`,
    );

    return true;
  }
}
