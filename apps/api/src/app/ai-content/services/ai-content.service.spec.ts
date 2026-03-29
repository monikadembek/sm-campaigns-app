import { Test, TestingModule } from '@nestjs/testing';
import { AiContentService } from './ai-content.service';

describe('AiContentService', () => {
  let service: AiContentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiContentService],
    }).compile();

    service = module.get<AiContentService>(AiContentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
