import { Test, TestingModule } from '@nestjs/testing';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';

describe('CampaignController', () => {
  let controller: CampaignController;
  let service: { getCampaigns: jest.Mock };

  beforeEach(async () => {
    service = {
      getCampaigns: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignController],
      providers: [{ provide: CampaignService, useValue: service }],
    }).compile();

    controller = module.get<CampaignController>(CampaignController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return campaigns for the current user', async () => {
    const mockCampaigns = [
      { id: '1', name: 'Campaign 1', status: 'DRAFT' },
    ];
    service.getCampaigns.mockResolvedValue(mockCampaigns);

    const result = await controller.getCampaigns('user-123');

    expect(result).toEqual(mockCampaigns);
    expect(service.getCampaigns).toHaveBeenCalledWith('user-123');
  });
});
