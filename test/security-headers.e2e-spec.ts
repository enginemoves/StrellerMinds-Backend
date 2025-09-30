import { Test, TestingModule } from '@nestjs/testing'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import fastifyHelmet from '@fastify/helmet'
import request from 'supertest'
import { AppModule } from '../src/app.module'

describe('Security Headers (e2e)', () => {
  let app: NestFastifyApplication

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    )

    // Register Helmet with the same config used in main.ts
    await app.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      // Match main.ts: disable COEP to avoid blocking resource loading during tests
      crossOriginEmbedderPolicy: false,
    })

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /health includes standard Helmet security headers', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200)

    const headers = res.headers

    // Core security headers
    expect(headers['x-frame-options']).toBeDefined()
    expect(headers['x-content-type-options']).toBeDefined()
    expect(headers['referrer-policy']).toBeDefined()

    // CSP configured explicitly in main.ts, should be present
    expect(headers['content-security-policy']).toBeDefined()

    // COEP is disabled in config, should not be present
    expect(headers['cross-origin-embedder-policy']).toBeUndefined()
  })

  it('GET /api includes Helmet headers (Swagger UI route)', async () => {
    // Swagger is mounted at /api in main.ts; even if UI is not initialized in test
    // the route should exist and headers should be applied globally by Helmet
    const res = await request(app.getHttpServer()).get('/api').expect(200)

    const headers = res.headers
    expect(headers['x-frame-options']).toBeDefined()
    expect(headers['x-content-type-options']).toBeDefined()
    expect(headers['referrer-policy']).toBeDefined()
    expect(headers['content-security-policy']).toBeDefined()
  })
})