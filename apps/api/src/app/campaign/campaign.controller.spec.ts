import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';

jest.mock('../auth/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

describe('CampaignController', () => {
  let controller: CampaignController;
  let service: { getCampaigns: jest.Mock; getCampaign: jest.Mock; createCampaign: jest.Mock };

  beforeEach(async () => {
    service = {
      getCampaigns: jest.fn(),
      getCampaign: jest.fn(),
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

  describe('getSingleCampaign', () => {
    it('should return a single campaign for the current user', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        name: 'Campaign 1',
        status: 'DRAFT',
        goal: { id: 1, slug: 'awareness', label: 'Brand Awareness', sortOrder: 1 },
        posts: [],
      };
      service.getCampaign.mockResolvedValue(mockCampaign);

      const result = await controller.getSingleCampaign('campaign-1', 'user-123');

      expect(result).toEqual(mockCampaign);
      expect(service.getCampaign).toHaveBeenCalledWith('campaign-1', 'user-123');
    });

    it('should throw NotFoundException when campaign is not found', async () => {
      service.getCampaign.mockResolvedValue(null);

      await expect(
        controller.getSingleCampaign('nonexistent-id', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException when service throws', async () => {
      service.getCampaign.mockRejectedValue(new Error('DB error'));

      await expect(
        controller.getSingleCampaign('campaign-1', 'user-123'),
      ).rejects.toThrow(InternalServerErrorException);
    });
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
