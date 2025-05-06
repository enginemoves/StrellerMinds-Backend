import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module'; // adjust path as needed

describe('ForumsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule], // Should include ForumsModule, TypeOrmModule, etc.
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/forums/category (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/forums/category')
      .send({ name: 'Tech Talk' })
      .expect(201);

    expect(response.body.name).toEqual('Tech Talk');
    expect(response.body.id).toBeDefined();
  });

  it('/forums/categories (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/forums/categories')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  afterAll(async () => {
    await app.close();
  });
});
