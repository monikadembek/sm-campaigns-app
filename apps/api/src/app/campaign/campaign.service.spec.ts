import { Test, TestingModule } from '@nestjs/testing';
import { CampaignService } from './campaign.service';
import { PrismaService } from '../database/prisma.service';

describe('CampaignService', () => {
  let service: CampaignService;
  let prisma: { campaign: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      campaign: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return campaigns for a user', async () => {
    const mockCampaigns = [
      { id: '1', name: 'Campaign 1', status: 'DRAFT' },
      { id: '2', name: 'Campaign 2', status: 'ACTIVE' },
    ];
    prisma.campaign.findMany.mockResolvedValue(mockCampaigns);

    const result = await service.getCampaigns('user-123');

    expect(result).toEqual(mockCampaigns);
    expect(prisma.campaign.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      select: { id: true, name: true, status: true },
      orderBy: { updatedAt: 'desc' },
    });
  });
});
