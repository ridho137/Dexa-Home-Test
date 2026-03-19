import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { RequestWithUser } from './credentials.middleware';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>() as RequestWithUser;
    const role = req.user?.role;

    if (role !== 'ADMIN_HR') {
      throw new ForbiddenException('INSUFFICIENT_ROLE');
    }

    return true;
  }
}
