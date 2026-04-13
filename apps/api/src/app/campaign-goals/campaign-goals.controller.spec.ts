import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { CampaignGoalsController } from './campaign-goals.controller';
import { CampaignGoalsService } from './campaign-goals.service';

jest.mock('../auth/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

describe('CampaignGoalsController', () => {
  let controller: CampaignGoalsController;
  let service: { getCampaignGoals: jest.Mock };

  beforeEach(async () => {
    service = {
      getCampaignGoals: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignGoalsController],
      providers: [{ provide: CampaignGoalsService, useValue: service }],
    }).compile();

    controller = module.get<CampaignGoalsController>(CampaignGoalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all campaign goals', async () => {
    const mockGoals = [
      { id: 1, slug: 'awareness', label: 'Brand Awareness', sortOrder: 1 },
      { id: 2, slug: 'engagement', label: 'Engagement', sortOrder: 2 },
    ];
    service.getCampaignGoals.mockResolvedValue(mockGoals);

    const result = await controller.getCampaignGoals();

    expect(result).toEqual(mockGoals);
    expect(service.getCampaignGoals).toHaveBeenCalled();
  });

  it('should return an empty array when no goals exist', async () => {
    service.getCampaignGoals.mockResolvedValue([]);

    const result = await controller.getCampaignGoals();

    expect(result).toEqual([]);
  });

  it('should throw InternalServerErrorException when service throws unexpected error', async () => {
    service.getCampaignGoals.mockRejectedValue(new Error('DB error'));

    await expect(controller.getCampaignGoals()).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
