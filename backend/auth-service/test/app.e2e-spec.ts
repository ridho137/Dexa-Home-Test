import { INestApplication, HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { env } from '../src/config/env';

describe('AuthService (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/login (POST) validation fails for weak password', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-api-key', env.apiKey)
      .send({ email: 'admin@dexa.local', password: 'weak' });

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('/auth/login (POST) fails with 401 for invalid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-api-key', env.apiKey)
      .send({ email: 'admin@dexa.local', password: 'Wrong#1234' });

    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('/auth/login (POST) succeeds with seeded admin', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-api-key', env.apiKey)
      .send({ email: 'admin@dexa.local', password: 'Admin#1234' });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });
});
