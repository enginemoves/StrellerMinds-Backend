import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn().mockImplementation((key: string) => {
          switch (key) {
            case 'DB_HOST':
              return 'localhost';
            case 'DB_PORT':
              return 5432;
            case 'DB_USER':
              return 'postgres';
            case 'DB_PASSWORD':
              return 'postgres';
            case 'DB_NAME':
              return 'postgres';
            case 'JWT_SECRET':
              return 'test-secret';
            case 'STELLAR_NETWORK':
              return 'testnet';
            default:
              return null;
          }
        }),
      })
      .overrideModule(TypeOrmModule)
      .useModule(TypeOrmModule.forRoot({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
        database: 'postgres',
        autoLoadEntities: true,
        synchronize: true,
      }))
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 30000); // Increase timeout to 30 seconds

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
