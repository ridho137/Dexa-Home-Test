import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAccessGuard } from './auth/jwt-access.guard';
import { AuthGrpcClient } from './auth/auth-grpc.client';
import { AppLogger } from './infrastructure/logger/app-logger.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app = (await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
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

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
