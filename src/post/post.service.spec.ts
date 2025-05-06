import { PostService } from './post.service';
import { Repository } from 'typeorm';
import { ForumPost } from './entities/forum-post.entity';
import { PostReaction } from './entities/forum-post-reaction.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

const mockPostRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
});

const mockReactionRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
});

describe('PostService', () => {
  let service: PostService;
  let postRepository: jest.Mocked<Repository<ForumPost>>;
  let reactionRepository: jest.Mocked<Repository<PostReaction>>;

  beforeEach(() => {
    postRepository = mockPostRepository() as any;
    reactionRepository = mockReactionRepository() as any;

    service = new PostService(postRepository, reactionRepository);
  });

  describe('createPost', () => {
    it('should create and save a post', async () => {
      const dto = {
        content: 'Test content',
        topicId: 'topic-1',
        authorId: 'user-1',
      };
      const createdPost = { ...dto };
      postRepository.create.mockReturnValue(createdPost as any);
      postRepository.save.mockResolvedValue(createdPost as any);

      const result = await service.createPost(dto as any);
      expect(postRepository.create).toHaveBeenCalledWith({
        ...dto,
        topic: { id: dto.topicId },
        author: { id: dto.authorId },
      });
      expect(postRepository.save).toHaveBeenCalledWith(createdPost);
      expect(result).toBe(createdPost);
    });
  });

  describe('reactToPost', () => {
    it('should throw NotFoundException if post not found', async () => {
      postRepository.findOne.mockResolvedValue(null);
      await expect(
        service.reactToPost('nonexistent', 'user-1', 'like'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create and save a reaction', async () => {
      const mockPost = { id: 'post-1' };
      const mockReaction = { type: 'like' };
      postRepository.findOne.mockResolvedValue(mockPost as any);
      reactionRepository.create.mockReturnValue(mockReaction as any);
      reactionRepository.save.mockResolvedValue(mockReaction as any);

      const result = await service.reactToPost('post-1', 'user-1', 'like');
      expect(postRepository.findOne).toHaveBeenCalledWith({ where: { id: 'post-1' } });
      expect(reactionRepository.create).toHaveBeenCalledWith({
        user: { id: 'user-1' },
        post: { id: 'post-1' },
        type: 'like',
      });
      expect(reactionRepository.save).toHaveBeenCalledWith(mockReaction);
      expect(result).toBe(mockReaction);
    });
  });
});
