import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { ForumPost } from './entities/forum-post.entity';
import { PostReaction } from './entities/forum-post-reaction.entity';
import { PostVote } from './entities/forum-post-vote.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from 'src/search/search.service';
import { SearchRepository } from 'src/search/search.repository';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Course } from 'src/courses/entities/course.entity';
import { User } from 'src/users/entities/user.entity';
import { ForumTopic } from 'src/topic/entities/forum-topic.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ForumPost,
      PostReaction,
      PostVote,
      Course,
      User,
      ForumTopic
    ]),
    EventEmitterModule.forRoot(), 
  ],
  controllers: [PostController],
  providers: [
    PostService,
    SearchService,
    SearchRepository, 
  ],
  exports: [
    PostService,
    SearchService,
  ],
})
export class PostModule {}
