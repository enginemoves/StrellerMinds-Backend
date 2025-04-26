import { Module } from '@nestjs/common';
import { ProgressModule } from './progress/progres.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { AuthModule } from './auth/auth.module';
import { CertificateModule } from './certificate/certificate.module';
import { ForumModule } from './forum/forum.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationModule } from './notification/notification.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { FilesModule } from './files/files.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LessonModule } from './lesson/lesson.module';
import { IpfsModule } from './ipfs/ipfs.module';
// import { Module } from '@nestjs/common';
import { ModerationModule } from './moderation/moderation.module';
import { CatogoryModule } from './catogory/catogory.module';
import { PostModule } from './post/post.module';
import { TopicModule } from './topic/topic.module';
import { SubmissionModule } from './dry-run/submission/submission.module';
import { SubmissionModule } from './submission/submission.module';
import { SubmissionService } from './submission.service';
import { SubmissionService } from './provider/submission/submission.service';
import { SubmissionService } from './submissio/provider/submission/submission.service';
import { CourseEnrollmentModule } from './course-enrollment/course-enrollment.module';
import { EnrollmentModule } from './enrollment/enrollment.module';

@Module({
  imports: [
    ProgressModule,
    ConfigModule.forRoot({
      isGlobal: true, // Makes config available across all modules
      envFilePath: ['.env.development'], // Loads variables from .env file
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        url: 'postgresql://gg_xbkp_user:oIBp6SxjmvV3pPzexykI5fzm2vbhx9jW@dpg-d06intjuibrs73el09rg-a.oregon-postgres.render.com/gg_xbkp',
        autoLoadEntities: true, // Automatically loads entity files
        synchronize: true, // ⚠️ Auto-sync schema (disable in production)
      }),
    }),

    UsersModule,
    CoursesModule,
    AuthModule,
    CertificateModule,
    ForumModule,
    PaymentModule,
    NotificationModule,
    BlockchainModule,
    FilesModule,
    EmailModule,
    HealthModule,
    LessonModule,
    IpfsModule,
    ModerationModule,
    CatogoryModule,
    PostModule,
    TopicModule,
    SubmissionModule,
    EnrollmentModule,
  ],
  controllers: [AppController],
  providers: [AppService, SubmissionService],
})
export class AppModule {}
