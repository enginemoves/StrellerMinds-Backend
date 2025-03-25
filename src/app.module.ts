import { Module } from '@nestjs/common';
import { ProgressModule } from './progress/progress.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';

@Module({
  imports: [ProgressModule],
    ConfigModule.forRoot({
      isGlobal: true, // Makes config available across all modules
      envFilePath: ['.env.development'], // Loads variables from .env file
    }),

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
        autoLoadEntities: true, // Automatically loads entity files
        synchronize: true, // ⚠️ Auto-sync schema (disable in production)
      }),
    }),

    UsersModule,

    CoursesModule,
  ],
})
export class AppModule {}
