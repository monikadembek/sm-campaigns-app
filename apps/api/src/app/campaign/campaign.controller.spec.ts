import { Test, TestingModule } from '@nestjs/testing';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';

describe('CampaignController', () => {
  let controller: CampaignController;
  let service: { getCampaigns: jest.Mock; createCampaign: jest.Mock };

  beforeEach(async () => {
    service = {
      getCampaigns: jest.fn(),
      createCampaign: jest.fn(),
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

  it('should create a campaign for the current user', async () => {
    const mockCreated = { id: 'new-id', name: 'New Campaign', status: 'DRAFT' };
    service.createCampaign.mockResolvedValue(mockCreated);

    const result = await controller.createCampaign('user-123', {
      name: 'New Campaign',
      goalId: 1,
    });

    expect(result).toEqual(mockCreated);
    expect(service.createCampaign).toHaveBeenCalledWith('user-123', {
      name: 'New Campaign',
      goalId: 1,
    });
  });
});
