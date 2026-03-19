import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

export interface AuthenticatedUser {
  userId: string;
  email?: string;
  role?: string;
  sessionId?: string;
}

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class CredentialsMiddleware implements NestMiddleware {
  use(req: RequestWithUser, _res: Response, next: NextFunction): void {
    const header = req.headers['x-user-credentials'];
    if (typeof header !== 'string') {
      throw new UnauthorizedException('MISSING_CREDENTIALS_HEADER');
    }

    try {
      const json = Buffer.from(header, 'base64').toString('utf8');
      const parsed = JSON.parse(json);
      req.user = {
        userId: parsed.userId,
        email: parsed.email,
        role: parsed.role,
        sessionId: parsed.sessionId,
      };
    } catch {
      throw new UnauthorizedException('INVALID_CREDENTIALS_HEADER');
    }

    next();
  }
}
