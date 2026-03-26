import { Test } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GetMeUseCase } from '../src/application/usecases/get-me.usecase';

describe('EmployeeService (e2e)', () => {
  const credentials = {
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'admin@dexa.local',
    role: 'ADMIN_HR',
    sessionId: 'a5756f27-ad39-44e3-8864-da7ee9988247',
  } as const;

  let app: INestApplication;
  let getMeMock: jest.Mock;

  beforeAll(async () => {
    getMeMock = jest.fn().mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Admin HR',
      email: 'admin@dexa.local',
      position: 'HRD',
      role: 'ADMIN_HR',
      phoneNumber: '+12345678910',
      photoUrl: null,
      isActive: true,
    });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GetMeUseCase)
      .useValue({ execute: getMeMock })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /employees/me should reject missing credentials header', async () => {
    const res = await request(app.getHttpServer())
      .get('/employees/me')
      .expect(HttpStatus.UNAUTHORIZED);

    expect(String(res.body.message ?? '')).toContain('MISSING_CREDENTIALS_HEADER');
  });

  it('GET /employees/me should reject invalid credentials header', async () => {
    const res = await request(app.getHttpServer())
      .get('/employees/me')
      .set('x-user-credentials', 'invalid-base64')
      .expect(HttpStatus.UNAUTHORIZED);

    expect(String(res.body.message ?? '')).toContain('INVALID_CREDENTIALS_HEADER');
  });

  it('GET /employees/me should pass with valid credentials header', async () => {
    const encoded = Buffer.from(
      JSON.stringify(credentials),
    ).toString('base64');

    const res = await request(app.getHttpServer())
      .get('/employees/me')
      .set('x-user-credentials', encoded)
      .expect(HttpStatus.OK);

    expect(res.body.id).toBe(credentials.userId);
    expect(getMeMock).toHaveBeenCalledWith(credentials.userId);
  });
});
