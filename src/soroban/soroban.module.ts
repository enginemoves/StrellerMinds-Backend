import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SorobanService } from './soroban.service';
import { CredentialRecord } from './entities/credential-record.entity';
import { SorobanController } from './soroban.controller';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([CredentialRecord])],
  controllers: [SorobanController],
  providers: [SorobanService],
  exports: [SorobanService],
})
export class SorobanModule {}
