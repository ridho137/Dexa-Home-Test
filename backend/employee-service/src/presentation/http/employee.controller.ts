import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { RequestWithUser } from './credentials.middleware';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GetMeUseCase } from '../../application/usecases/get-me.usecase';
import { UpdateMyProfileUseCase } from '../../application/usecases/update-my-profile.usecase';
import { ChangeMyPasswordUseCase } from '../../application/usecases/change-my-password.usecase';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';

@Controller('employees')
export class EmployeeController {
  constructor(
    private readonly logger: AppLogger,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateMyProfileUseCase: UpdateMyProfileUseCase,
    private readonly changeMyPasswordUseCase: ChangeMyPasswordUseCase,
  ) {}

  @Get('me')
  async getMe(@Req() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) {
      this.logger.warn('EmployeeController: getMe without userId');
      throw new UnauthorizedException('MISSING_USER');
    }
    this.logger.debug('EmployeeController: getMe called', { userId });
    return this.getMeUseCase.execute(userId);
  }

  @Patch('me/profile')
  @UseInterceptors(FileInterceptor('photo'))
  async updateMyProfile(
    @Req() req: RequestWithUser,
    @Body() body: UpdateProfileDto,
    @UploadedFile() file?: any,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      return;
    }

    return this.updateMyProfileUseCase.execute(
      userId,
      {
        phoneNumber: body.phoneNumber ?? null,
        photoUrl: body.photoUrl ?? null,
      },
      file
        ? {
            buffer: file.buffer,
            mimetype: file.mimetype,
            originalName: file.originalname,
          }
        : undefined,
    );
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeMyPassword(
    @Req() req: RequestWithUser,
    @Body() body: ChangePasswordDto,
  ): Promise<void> {
    const userId = req.user?.userId;
    if (!userId) {
      return;
    }
    this.logger.debug('EmployeeController: changeMyPassword called', {
      userId,
    });
    await this.changeMyPasswordUseCase.execute(userId, {
      oldPassword: body.oldPassword,
      newPassword: body.newPassword,
    });
  }
}
