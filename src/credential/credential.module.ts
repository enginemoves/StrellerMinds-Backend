import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialService } from './credential.service';
import { CredentialController } from './credential.controller';
import { Credential } from './entities/credential.entity';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([Credential]), SharedModule],
  controllers: [CredentialController],
  providers: [CredentialService],
  exports: [CredentialService], // Export if other modules need CredentialService
})
export class CredentialModule {}
