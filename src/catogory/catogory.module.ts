import { Module } from '@nestjs/common';
import { ForumCategoryService } from './catogory.service';
import { CategoryController } from './catogory.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForumCategory } from './entities/forum-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ForumCategory])],
  controllers: [CategoryController],
  providers: [ForumCategoryService],
  exports: [ForumCategoryService],
})
export class CatogoryModule {}
