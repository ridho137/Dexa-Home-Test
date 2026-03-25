import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { JwtAccessGuard } from './auth/jwt-access.guard';
import { AuthGrpcClient } from './auth/auth-grpc.client';
import { AppLogger } from './infrastructure/logger/app-logger.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app = (await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        JwtAccessGuard,
        AppLogger,
        {
          provide: AuthGrpcClient,
          useValue: {
            checkAccessToken: jest.fn(),
            checkRefreshToken: jest.fn(),
          },
        },
      ],
    }).compile()) as any;

    appController = app.get(AppController);
  });

});
