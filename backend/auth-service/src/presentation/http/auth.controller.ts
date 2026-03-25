import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Delete,
  Get,
  Post,
  UnauthorizedException,
  Headers,
} from '@nestjs/common';
import {
  LoginUseCase,
  InvalidCredentialsError,
} from '../../application/usecases/login.usecase';
import { RefreshTokenUseCase } from '../../application/usecases/refresh-token.usecase';
import { LogoutUseCase } from '../../application/usecases/logout.usecase';
import { env } from '../../config/env';
import { AppLogger } from '../../infrastructure/logger/app-logger.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly logger: AppLogger,
  ) {}

  private verifyApiKey(apiKey: string | undefined) {
    if (!apiKey || apiKey !== env.apiKey) {
      this.logger.warn('AuthController: invalid API key on login');
      throw new UnauthorizedException('INVALID_API_KEY');
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto, @Headers('x-api-key') apiKey?: string) {
    this.verifyApiKey(apiKey);
    try {
      this.logger.debug(`AuthController: login attempt for ${body.email}`);
      const { accessToken, refreshToken } = await this.loginUseCase.execute({
        email: body.email,
        password: body.password,
      });

      return {
        accessToken,
        refreshToken,
      };
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        this.logger.warn(
          `AuthController: invalid credentials for ${body.email}`,
        );
        throw new UnauthorizedException('INVALID_CREDENTIALS');
      }
      this.logger.error('AuthController: unexpected error during login', err);
      throw err;
    }
  }

  @Get('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Headers('x-user-credentials') credsHeader?: string) {
    if (!credsHeader) {
      this.logger.warn('AuthController: missing x-user-credentials header on refresh');
      throw new UnauthorizedException('MISSING_CREDENTIALS_HEADER');
    }

    this.logger.debug('AuthController: refresh via gateway credentials header');
    let decoded: any;
    try {
      const json = Buffer.from(credsHeader, 'base64').toString('utf8');
      decoded = JSON.parse(json);
    } catch {
      this.logger.warn('AuthController: invalid x-user-credentials header');
      throw new UnauthorizedException('INVALID_CREDENTIALS_HEADER');
    }

    const { sessionId, userId } = decoded;
    if (!sessionId || !userId) {
      this.logger.warn(
        'AuthController: missing sessionId/userId in credentials header',
      );
      throw new UnauthorizedException('INVALID_CREDENTIALS_HEADER');
    }

    return this.refreshTokenUseCase.execute(sessionId, userId);
  }

  @Delete('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Headers('x-user-credentials') credsHeader?: string) {
    if (!credsHeader) {
      this.logger.warn('AuthController: missing x-user-credentials header on logout');
      throw new UnauthorizedException('MISSING_CREDENTIALS_HEADER');
    }

    this.logger.debug('AuthController: logout via gateway credentials header');
    let decoded: any;
    try {
      const json = Buffer.from(credsHeader, 'base64').toString('utf8');
      decoded = JSON.parse(json);
    } catch {
      this.logger.warn('AuthController: invalid x-user-credentials header');
      throw new UnauthorizedException('INVALID_CREDENTIALS_HEADER');
    }

    const { sessionId } = decoded;
    if (!sessionId) {
      this.logger.warn(
        'AuthController: missing sessionId in credentials header on logout',
      );
      throw new UnauthorizedException('INVALID_CREDENTIALS_HEADER');
    }

    await this.logoutUseCase.execute(sessionId);
  }
}
