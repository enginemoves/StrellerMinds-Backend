import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Release } from './entities/release.entity';
import { Artifact } from './entities/artifact.entity';
import { Deployment } from './entities/deployment.entity';
import { ReleaseService } from './release.service';
import { ReleaseController } from './release.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Release, Artifact, Deployment])],
  controllers: [ReleaseController],
  providers: [ReleaseService],
  exports: [ReleaseService],
})
export class ReleaseModule {}
