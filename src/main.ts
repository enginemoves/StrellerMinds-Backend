import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { RolesGuard } from './role/roles.guard';
import { GlobalExceptionsFilter } from './common/filters/global-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import {
  I18nValidationExceptionFilter,
  i18nValidationErrorFactory,
} from 'nestjs-i18n';
import { I18nService } from 'nestjs-i18n';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get i18n service for error translations
  const i18nService = app.get<I18nService>(I18nService);

  // ✅ Global Validation Pipe with i18n error support
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: i18nValidationErrorFactory,
      forbidNonWhitelisted: true,
    }),
  );

  // ✅ Global exception and role guards
  app.useGlobalFilters(
    new GlobalExceptionsFilter(i18nService as I18nService<Record<string, unknown>>),
    new I18nValidationExceptionFilter(), // 👈 Add i18n-aware error filter
  );
  app.useGlobalGuards(new RolesGuard(new Reflector()));

  // ✅ Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Mentor Grading API')
    .setDescription(
      'APIs for mentors to grade student assignments and provide feedback. Admin API for course management.'
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
