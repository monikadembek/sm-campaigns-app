import { Test, TestingModule } from '@nestjs/testing';
import { CampaignGoalsController } from './campaign-goals.controller';

describe('CampaignGoalsController', () => {
  let controller: CampaignGoalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignGoalsController],
    }).compile();

    controller = module.get<CampaignGoalsController>(CampaignGoalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
