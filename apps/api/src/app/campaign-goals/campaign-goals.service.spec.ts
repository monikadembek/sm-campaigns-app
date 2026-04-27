import { Test, TestingModule } from '@nestjs/testing';
import { CampaignGoalsService } from './campaign-goals.service';
import { PrismaService } from '../database/prisma.service';

describe('CampaignGoalsService', () => {
  let service: CampaignGoalsService;
  let prisma: {
    campaignGoal: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      campaignGoal: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignGoalsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CampaignGoalsService>(CampaignGoalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all campaign goals ordered by sortOrder', async () => {
    const mockGoals = [
      { id: 1, slug: 'awareness', label: 'Brand Awareness', sortOrder: 1 },
      { id: 2, slug: 'engagement', label: 'Engagement', sortOrder: 2 },
      { id: 3, slug: 'conversions', label: 'Conversions', sortOrder: 3 },
    ];
    prisma.campaignGoal.findMany.mockResolvedValue(mockGoals);

    const result = await service.getCampaignGoals();

    expect(result).toEqual(mockGoals);
    expect(prisma.campaignGoal.findMany).toHaveBeenCalledWith({
      orderBy: { sortOrder: 'asc' },
    });
  });

  it('should return an empty array when no goals exist', async () => {
    prisma.campaignGoal.findMany.mockResolvedValue([]);

    const result = await service.getCampaignGoals();

    expect(result).toEqual([]);
  });

  it('should propagate database errors', async () => {
    prisma.campaignGoal.findMany.mockRejectedValue(new Error('DB connection failed'));

    await expect(service.getCampaignGoals()).rejects.toThrow('DB connection failed');
  });
});
