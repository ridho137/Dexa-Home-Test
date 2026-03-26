import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { env } from '../src/config/env';

describe('AuthService (e2e)', () => {
  const credentials = {
    email: 'admin@dexa.local',
    weakPassword: 'weak-password',
    wrongPassword: 'Wrong#1234',
    truePassword: 'Admin_137!',
  } as const;
  
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/login (POST) validation fails for weak password', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-api-key', env.apiKey)
      .send({ email: credentials.email, password: credentials.weakPassword });

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('/auth/login (POST) should reject missing API key', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: credentials.wrongPassword });

    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('/auth/login (POST) fails with 401 for invalid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-api-key', env.apiKey)
      .send({ email: credentials.email, password: credentials.wrongPassword });

    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('/auth/login (POST) succeeds with seeded admin', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-api-key', env.apiKey)
      .send({ email: credentials.email, password: credentials.truePassword });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });
});
