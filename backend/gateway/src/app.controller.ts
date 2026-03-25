import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAccessGuard } from './auth/jwt-access.guard';

@Controller()
export class AppController {

  @Get('me')
  @UseGuards(JwtAccessGuard)
  getMe(@Req() req: Request) {
    return (req as any).user;
  }
}
