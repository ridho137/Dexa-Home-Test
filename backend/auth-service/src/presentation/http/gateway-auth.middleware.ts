import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { createHmac } from 'crypto';
import { env } from '../../config/env';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

@Injectable()
export class GatewayAuthMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLogger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Allow public login endpoint (protected by API key instead)
    // Depending on how Nest mounts the middleware, the path can be '/login'
    // (controller prefix 'auth') or full '/auth/login' (originalUrl).
    const original = (req as any).originalUrl ?? req.url ?? req.path;
    if (req.path === '/login' || original.startsWith('/auth/login')) {
      return next();
    }

    const encoded = req.headers['x-user-credentials'];
    const signature = req.headers['x-gateway-signature'];

    if (typeof encoded !== 'string' || typeof signature !== 'string') {
      this.logger.warn(
        'GatewayAuthMiddleware: missing credentials/signature header',
      );
      throw new UnauthorizedException('MISSING_CREDENTIALS_HEADER');
    }

    const expected = createHmac('sha256', env.gatewaySigningSecret)
      .update(encoded)
      .digest('hex');

    if (signature !== expected) {
      this.logger.warn('GatewayAuthMiddleware: invalid gateway signature');
      throw new UnauthorizedException('INVALID_GATEWAY_SIGNATURE');
    }

    return next();
  }
}
