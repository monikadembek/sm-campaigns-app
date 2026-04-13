import { Test, TestingModule } from '@nestjs/testing';
import { CampaignGoalsService } from './campaign-goals.service';

describe('CampaignGoalsService', () => {
  let service: CampaignGoalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CampaignGoalsService],
    }).compile();

    service = module.get<CampaignGoalsService>(CampaignGoalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
