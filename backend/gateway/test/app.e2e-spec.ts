import { Test } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthGrpcClient } from '../src/auth/auth-grpc.client';
import { ProxyService } from '../src/proxy/proxy.service';

describe('Gateway (e2e)', () => {
  const credentials = {
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'admin@dexa.local',
    role: 'ADMIN_HR',
    sessionId: 'a5756f27-ad39-44e3-8864-da7ee9988247',
  } as const;

  let app: INestApplication;
  let checkAccessTokenMock: jest.Mock;
  let forwardMock: jest.Mock;

  beforeAll(async () => {
    checkAccessTokenMock = jest.fn();
    forwardMock = jest.fn();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthGrpcClient)
      .useValue({
        checkAccessToken: checkAccessTokenMock,
      })
      .overrideProvider(ProxyService)
      .useValue({
        forward: forwardMock,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('OPTIONS any route should return 204 without auth', async () => {
    const res = await request(app.getHttpServer())
      .options('/attendance/attendances/me')
      .expect(HttpStatus.NO_CONTENT);

    expect(res.text).toBe('');
  });

  it('GET protected route without bearer token should return 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/attendance/attendances/me')
      .expect(HttpStatus.UNAUTHORIZED);

    expect(String(res.body.message ?? '')).toContain('MISSING_ACCESS_TOKEN');
  });

  it('GET protected route with valid token should forward upstream', async () => {
    checkAccessTokenMock.mockResolvedValueOnce({
      valid: true,
      userId: credentials.userId,
      email: credentials.email,
      role: credentials.role,
      sessionId: credentials.sessionId,
    });
    forwardMock.mockResolvedValueOnce({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: { ok: true },
    });

    const res = await request(app.getHttpServer())
      .get('/employee/employees/me')
      .set('authorization', 'Bearer access-token')
      .expect(HttpStatus.OK);

    expect(res.body).toEqual({ ok: true });
    expect(checkAccessTokenMock).toHaveBeenCalledWith('access-token');
    expect(forwardMock).toHaveBeenCalled();
  });
});
