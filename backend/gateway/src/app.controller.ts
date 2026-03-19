import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AppService } from './app.service';
import { JwtAccessGuard } from './auth/jwt-access.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('me')
  @UseGuards(JwtAccessGuard)
  getMe(@Req() req: Request) {
    return (req as any).user;
  }
}
