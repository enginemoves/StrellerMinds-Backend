import { Test, TestingModule } from '@nestjs/testing';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { SearchService } from 'src/search/search.service';

describe('PostController', () => {
  let controller: PostController;
  let postService: PostService;
  let searchService: SearchService;

  const mockPostService = {
    createPost: jest.fn(),
    reactToPost: jest.fn(),
  };

  const mockSearchService = {
    searchPosts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        { provide: PostService, useValue: mockPostService },
        { provide: SearchService, useValue: mockSearchService },
      ],
    }).compile();

    controller = module.get<PostController>(PostController);
    postService = module.get<PostService>(PostService);
    searchService = module.get<SearchService>(SearchService);
  });

  it('should create a post', async () => {
    const dto = { content: 'New post', topicId: '1', authorId: '2' };
    const result = { id: '123', ...dto };
    mockPostService.createPost.mockResolvedValue(result);

    const req = { user: { id: '2' } };
    const response = await controller.createPost(dto as any, req as any);

    expect(postService.createPost).toHaveBeenCalledWith(dto);
    expect(response).toEqual(result);
  });

  it('should react to a post', async () => {
    const dto = { type: 'like' };
    const postId = 'post-id';
    const user = { id: 'user-id' };
    const mockReaction = { id: 'reaction-id' };

    mockPostService.reactToPost.mockResolvedValue(mockReaction);

    const result = await controller.reactToPost(postId, dto, { user } as any);

    expect(postService.reactToPost).toHaveBeenCalledWith(postId, 'user-id', 'like');
    expect(result).toEqual(mockReaction);
  });

  it('should call search service', async () => {
    const mockResults = [{ id: 'post-1' }, { id: 'post-2' }];
    mockSearchService.searchPosts.mockResolvedValue(mockResults);

    const result = await controller.searchPosts('test', 1, 10);
    expect(searchService.searchPosts).toHaveBeenCalledWith('test', 1, 10);
    expect(result).toEqual(mockResults);
  });
});
