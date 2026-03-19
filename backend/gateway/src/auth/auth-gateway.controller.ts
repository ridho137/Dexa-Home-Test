import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGrpcClient } from './auth-grpc.client';
import { AuthHttpService } from './auth-http.service';

@Controller('auth')
export class AuthGatewayController {
  constructor(
    private readonly authGrpc: AuthGrpcClient,
    private readonly authHttp: AuthHttpService,
  ) {}

  @Get('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request) {
    const authHeader = req.headers.authorization ?? '';
    const [, token] = authHeader.split(' ');

    if (!token) {
      throw new UnauthorizedException('MISSING_REFRESH_TOKEN');
    }

    // 1) Validate refresh token through gRPC
    const res = await this.authGrpc.checkRefreshToken(token);
    if (!res.valid) {
      throw new UnauthorizedException(res.errorCode ?? 'INVALID_REFRESH_TOKEN');
    }

    // 2) Forward to auth-service REST endpoint with gateway credentials header
    return this.authHttp.refreshWithCredentials({
      userId: res.userId!,
      sessionId: res.sessionId!,
      email: res.email,
      role: res.role,
    });
  }
}
