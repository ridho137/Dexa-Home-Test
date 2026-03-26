import { Test } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ListMyAttendanceUseCase } from '../src/application/usecases/list-my-attendance.usecase';

describe('AttendanceService (e2e)', () => {
  const credentials = {
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'admin@dexa.local',
    role: 'ADMIN_HR',
    sessionId: 'a5756f27-ad39-44e3-8864-da7ee9988247',
  } as const;

  let app: INestApplication;
  let listMyMock: jest.Mock;

  beforeAll(async () => {
    listMyMock = jest.fn().mockResolvedValue({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      data: [],
    });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ListMyAttendanceUseCase)
      .useValue({ execute: listMyMock })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /attendances/me should reject missing credentials header', async () => {
    const res = await request(app.getHttpServer())
      .get('/attendances/me')
      .expect(HttpStatus.UNAUTHORIZED);

    expect(String(res.body.message ?? '')).toContain('MISSING_CREDENTIALS_HEADER');
  });

  it('GET /attendances/me should reject invalid credentials header', async () => {
    const res = await request(app.getHttpServer())
      .get('/attendances/me')
      .set('x-user-credentials', 'not-base64')
      .expect(HttpStatus.UNAUTHORIZED);

    expect(String(res.body.message ?? '')).toContain('INVALID_CREDENTIALS_HEADER');
  });

  it('GET /attendances/me should pass with valid credentials header', async () => {
    const encoded = Buffer.from(
      JSON.stringify(credentials),
    ).toString('base64');

    const res = await request(app.getHttpServer())
      .get('/attendances/me')
      .set('x-user-credentials', encoded)
      .expect(HttpStatus.OK);

    expect(res.body).toEqual({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      data: [],
    });
    expect(listMyMock).toHaveBeenCalled();
  });
});
