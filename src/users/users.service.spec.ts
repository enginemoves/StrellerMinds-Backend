import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

const mockUser = {
  id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  profileImageUrl: 'image.jpg',
};

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  describe('create', () => {
    it('should create and return a new user if email does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockUser);
      repo.save.mockResolvedValue(mockUser);

      const result = await service.create(
        {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          profileImageUrl: 'image.jpg',
        },
        { path: 'image.jpg' } as Express.Multer.File,
      );

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(repo.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: 'image.jpg',
      });
      expect(repo.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if user with email exists', async () => {
      repo.findOne.mockResolvedValue(mockUser);

      await expect(
        service.create(
          {
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
          },
          undefined,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException on other errors', async () => {
      repo.findOne.mockRejectedValue(new Error('DB error'));

      await expect(
        service.create({
          email: 'fail@example.com',
          firstName: 'Fail',
          lastName: 'User',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
