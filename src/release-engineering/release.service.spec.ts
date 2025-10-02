import { Test, TestingModule } from '@nestjs/testing';
import { ReleaseService } from '../release.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Release } from '../entities/release.entity';
import { Artifact } from '../entities/artifact.entity';
import { Deployment } from '../entities/deployment.entity';
import { Repository } from 'typeorm';

describe('ReleaseService', () => {
  let service: ReleaseService;
  let releaseRepo: Repository<Release>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReleaseService,
        { provide: getRepositoryToken(Release), useClass: Repository },
        { provide: getRepositoryToken(Artifact), useClass: Repository },
        { provide: getRepositoryToken(Deployment), useClass: Repository },
      ],
    }).compile();

    service = module.get<ReleaseService>(ReleaseService);
    releaseRepo = module.get<Repository<Release>>(getRepositoryToken(Release));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests with mocks for repository methods (e.g. jest.spyOn)
});
