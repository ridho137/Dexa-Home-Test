import { Test } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { NotificationEventConsumer } from '../src/infrastructure/rabbitmq/notification-event.consumer';
import { AdminNotificationGateway } from '../src/presentation/websocket/admin-notification.gateway';

describe('NotificationService (e2e)', () => {
  const broadcastToAdminsPayload = {
    type: 'EMPLOYEE_UPDATED',
    actorUserId: '00000000-0000-0000-0000-000000000001',
    actorEmail: 'admin@dexa.local',
    actorRole: 'ADMIN_HR',
  } as const;

  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NotificationEventConsumer)
      .useValue({
        onModuleInit: async () => Promise.resolve(),
        onModuleDestroy: async () => Promise.resolve(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / should return 404 (no HTTP controller by design)', async () => {
    await request(app.getHttpServer()).get('/').expect(HttpStatus.NOT_FOUND);
  });

  it('broadcastToAdmins should be callable', () => {
    const gateway = app.get(AdminNotificationGateway);
    expect(() =>
      gateway.broadcastToAdmins(broadcastToAdminsPayload),
    ).not.toThrow();
  });
});
