import {
  All,
  Controller,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHmac } from 'crypto';
import { AuthGrpcClient } from '../auth/auth-grpc.client';
import { ProxyService } from './proxy.service';
import { AppLogger } from '../infrastructure/logger/app-logger.service';
import { env } from '../config/env';

@Controller()
export class ProxyController {
  constructor(
    private readonly authGrpc: AuthGrpcClient,
    private readonly proxyService: ProxyService,
    private readonly logger: AppLogger,
  ) {}

  @All('*')
  async handle(@Req() req: Request, @Res() res: Response) {
    // Preflight requests for CORS should not require auth headers.
    if (req.method === 'OPTIONS') {
      return res.status(204).send();
    }

    const path = req.path;

    // 1) /auth/login -> bypass (forward directly to auth-service)
    if (path === '/auth/login') {
      this.logger.debug('ProxyController: bypass /auth/login');
      const upstream = await this.proxyService.forward(req);
      return this.sendUpstream(res, upstream);
    }

    // 2) /auth/refresh -> handled by dedicated controller, skip here
    if (path === '/auth/refresh') {
      // Let AuthGatewayController handle this route
      throw new UnauthorizedException('ROUTE_HANDLED_ELSEWHERE');
    }

    // 3) For all other routes, validate access token via gRPC
    const authHeader = req.headers.authorization ?? '';
    const [, token] = authHeader.split(' ');

    if (!token) {
      this.logger.warn('ProxyController: missing access token', { path });
      throw new UnauthorizedException('MISSING_ACCESS_TOKEN');
    }

    const check = await this.authGrpc.checkAccessToken(token);
    if (!check.valid) {
      this.logger.warn('ProxyController: invalid access token', {
        path,
        errorCode: check.errorCode,
      });
      throw new UnauthorizedException(
        check.errorCode ?? 'INVALID_ACCESS_TOKEN',
      );
    }

    // 4) Construct credentials from token payload and encode as base64
    const credentials = {
      userId: check.userId,
      email: check.email,
      role: check.role,
      sessionId: check.sessionId,
    };

    const credentialsJson = JSON.stringify(credentials);
    const encoded = Buffer.from(credentialsJson).toString('base64');

    const signature = createHmac('sha256', env.gatewaySigningSecret)
      .update(encoded)
      .digest('hex');

    this.logger.debug('ProxyController: forwarding with credentials', {
      path,
      userId: check.userId,
      role: check.role,
    });

    const upstream = await this.proxyService.forward(req, {
      'x-user-credentials': encoded,
      'x-gateway-signature': signature,
    });

    return this.sendUpstream(res, upstream);
  }

  private sendUpstream(
    res: Response,
    upstream: { status: number; headers: Record<string, string>; body: any },
  ) {
    Object.entries(upstream.headers).forEach(([key, value]) => {
      if (key.toLowerCase() === 'content-length') return;
      res.setHeader(key, value);
    });
    res.status(upstream.status).send(upstream.body);
  }
}
