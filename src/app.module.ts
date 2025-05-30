import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';

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
import { LessonModule } from './lesson/lesson.module';
import { IpfsModule } from './ipfs/ipfs.module';
import { ModerationModule } from './moderation/moderation.module';
import { CatogoryModule } from './catogory/catogory.module';
import { PostModule } from './post/post.module';
import { TopicModule } from './topic/topic.module';
import { SubmissionModule } from './submission/submission.module';
import { UserProfilesModule } from './user-profiles/user-profiles.module';
import { CredentialModule } from './credential/credential.module';
import { MentorshipModule } from './mentorship/mentorship.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Global Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
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
    UserProfilesModule,
    CredentialModule,
    MentorshipModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
