import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { env } from '../config/env';
import { AppLogger } from '../infrastructure/logger/app-logger.service';

@Injectable()
export class AuthHttpService {
  constructor(private readonly logger: AppLogger) {}

  async refreshWithCredentials(payload: {
    userId: string;
    sessionId: string;
    email?: string;
    role?: string;
  }): Promise<any> {
    const url = `${env.authHttpUrl}/auth/refresh`;
    this.logger.debug('AuthHttpService: forwarding refresh to auth-service', {
      url,
    });

    const credentialsJson = JSON.stringify(payload);
    const encoded = Buffer.from(credentialsJson).toString('base64');

    const signature = createHmac('sha256', env.gatewaySigningSecret)
      .update(encoded)
      .digest('hex');

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-user-credentials': encoded,
        'x-gateway-signature': signature,
      },
    });

    if (!res.ok) {
      this.logger.warn('AuthHttpService: auth-service refresh failed', {
        status: res.status,
      });
      throw new UnauthorizedException('REFRESH_FAILED');
    }

    const body = await res.json();
    return body;
  }
}
