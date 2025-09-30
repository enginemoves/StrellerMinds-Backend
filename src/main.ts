import { NestFactory, Reflector } from '@nestjs/core'
import { AppModule } from './app.module'
import { RolesGuard } from './role/roles.guard'
import { GlobalExceptionsFilter } from './common/filters/global-exception.filter'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ValidationPipe } from '@nestjs/common'
import compress from '@fastify/compress'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import fastifyHelmet from '@fastify/helmet'
import fastifyCsrf from '@fastify/csrf-protection'
import fastifyCookie from '@fastify/cookie'
import { FastifyRequest } from 'fastify'
import request from 'request'

import { setupTracing } from './monitoring/tracing.bootstrap'

async function bootstrap() {
  await setupTracing()

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  )

  // Register compression
  await app.register(compress, {
    threshold: 1024, // Only compress if response > 1KB
    global: true,
    encodings: ['gzip', 'deflate', 'br'],
  })

  // Register Helmet for security headers with safe defaults and CSP suitable for Swagger
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
    // Some apps need this disabled to avoid blocking resource loading
    crossOriginEmbedderPolicy: false,
  })

  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') ?? []
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) cb(null, true)
      else cb(new Error('Not allowed by CORS'), false)
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })

  // Conditionally enable cookie parsing and CSRF protection for state-changing endpoints if cookies/sessions are used
  const usesCookiesOrSessions = Boolean(
    process.env.SESSION_SECRET ||
      process.env.COOKIE_HTTP_ONLY ||
      process.env.COOKIE_SECURE,
  )

  if (usesCookiesOrSessions) {
    // Secure cookie defaults
    await app.register(fastifyCookie, {
      secret: process.env.SESSION_SECRET, // used for signed cookies
      parseOptions: {
        httpOnly: process.env.COOKIE_HTTP_ONLY !== 'false',
        secure: process.env.COOKIE_SECURE === 'true',
        sameSite: 'lax',
      },
    })

    // Register CSRF protection globally (non-GET/HEAD/OPTIONS)
    await app.register(fastifyCsrf)
  }

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )

  // Global exception and role guards
  const i18n = app.get('I18nService')
  const loggerService = app.get('LoggerService')
  const sentryService = app.get('SentryService')
  const alertingService = app.get('AlertingService')
  const errorDashboardService = app.get('ErrorDashboardService')
  app.useGlobalFilters(
    new GlobalExceptionsFilter(
      i18n,
      loggerService,
      sentryService,
      alertingService,
      errorDashboardService,
    ),
  )
  app.useGlobalGuards(new RolesGuard(new Reflector()))

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Mentor Grading API')
    .setDescription(
      'APIs for mentors to grade student assignments and provide feedback. Admin API for course management.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document)

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000)
}

bootstrap()