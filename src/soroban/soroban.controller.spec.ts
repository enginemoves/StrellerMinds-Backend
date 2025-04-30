import { Test, TestingModule } from '@nestjs/testing';
import { SorobanController } from './soroban.controller';
import { SorobanService } from './soroban.service';

describe('SorobanController', () => {
  let controller: SorobanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SorobanController],
      providers: [SorobanService],
    }).compile();

    controller = module.get<SorobanController>(SorobanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
