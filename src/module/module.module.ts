import { Module } from '@nestjs/common';
import { ModuleController } from './module.controller';
import { ModuleService } from './module.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import {Module as ModuleEntity} from './entities/module.entity'

@Module({    
  imports: [TypeOrmModule.forFeature([ModuleEntity])],
  controllers: [ModuleController],
  providers: [ModuleService]
})
export class ModuleModule {}
