import { Test, TestingModule } from '@nestjs/testing';
import { CampaignService } from './campaign.service';
import { PrismaService } from '../database/prisma.service';

describe('CampaignService', () => {
  let service: CampaignService;
  let prisma: {
    campaign: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      campaign: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
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

  it('should create a campaign and return summary', async () => {
    const mockCreated = { id: 'new-id', name: 'New Campaign', status: 'DRAFT' };
    prisma.campaign.create.mockResolvedValue(mockCreated);

    const result = await service.createCampaign('user-123', {
      name: 'New Campaign',
      goalId: 1,
    });

    expect(result).toEqual(mockCreated);
    expect(prisma.campaign.create).toHaveBeenCalledWith({
      data: {
        name: 'New Campaign',
        goalId: 1,
        userId: 'user-123',
      },
      select: { id: true, name: true, status: true },
    });
  });

  describe('getCampaignsFull', () => {
    it('should return full campaigns with goal and posts for a user', async () => {
      const mockCampaigns = [
        {
          id: '1',
          userId: 'user-123',
          goalId: 1,
          name: 'Campaign 1',
          audience: null,
          startDate: null,
          endDate: null,
          timezone: null,
          status: 'DRAFT',
          notes: null,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-02'),
          goal: { id: 1, slug: 'awareness', label: 'Brand Awareness', sortOrder: 1 },
          posts: [
            { id: 'post-1', platform: 'INSTAGRAM', postType: 'IMAGE' },
          ],
        },
      ];
      prisma.campaign.findMany.mockResolvedValue(mockCampaigns);

      const result = await service.getCampaignsFull('user-123');

      expect(result).toEqual(mockCampaigns);
      expect(prisma.campaign.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { updatedAt: 'desc' },
        include: {
          goal: true,
          posts: {
            select: {
              id: true,
              platform: true,
              postType: true,
            },
          },
        },
      });
    });

    it('should return an empty array when user has no campaigns', async () => {
      prisma.campaign.findMany.mockResolvedValue([]);

      const result = await service.getCampaignsFull('user-no-campaigns');

      expect(result).toEqual([]);
    });
  });

  describe('getCampaign', () => {
    it('should return a single campaign with goal, posts, and media', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        userId: 'user-123',
        goalId: 1,
        name: 'Campaign 1',
        audience: null,
        startDate: null,
        endDate: null,
        timezone: null,
        status: 'DRAFT',
        notes: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        goal: { id: 1, slug: 'awareness', label: 'Brand Awareness', sortOrder: 1 },
        posts: [
          {
            id: 'post-1',
            platform: 'INSTAGRAM',
            postType: 'IMAGE',
            postMedia: [
              {
                id: 'pm-1',
                media: { id: 'media-1', url: 'https://example.com/image.jpg' },
              },
            ],
          },
        ],
      };
      prisma.campaign.findUnique.mockResolvedValue(mockCampaign);

      const result = await service.getCampaign('campaign-1', 'user-123');

      expect(result).toEqual(mockCampaign);
      expect(prisma.campaign.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'campaign-1',
          userId: 'user-123',
        },
        include: {
          goal: true,
          posts: {
            include: {
              postMedia: {
                include: {
                  media: true,
                },
              },
            },
          },
        },
      });
    });

    it('should return null when campaign is not found', async () => {
      prisma.campaign.findUnique.mockResolvedValue(null);

      const result = await service.getCampaign('nonexistent-id', 'user-123');

      expect(result).toBeNull();
    });

    it('should return null when campaign belongs to a different user', async () => {
      prisma.campaign.findUnique.mockResolvedValue(null);

      const result = await service.getCampaign('campaign-1', 'other-user');

      expect(result).toBeNull();
      expect(prisma.campaign.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'campaign-1',
          userId: 'other-user',
        },
        include: expect.any(Object),
      });
    });
  });

  describe('updateCampaign', () => {
    const campaignDetailsInclude = {
      goal: true,
      posts: {
        include: {
          postMedia: {
            include: {
              media: true,
            },
          },
        },
      },
    };

    const mockUpdatedCampaign = {
      id: 'campaign-1',
      userId: 'user-123',
      goalId: 1,
      name: 'Updated Campaign',
      audience: null,
      startDate: null,
      endDate: null,
      timezone: 'UTC',
      status: 'DRAFT',
      notes: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-13'),
      goal: { id: 1, slug: 'awareness', label: 'Brand Awareness', sortOrder: 1 },
      posts: [],
    };

    it('should update campaign name', async () => {
      prisma.campaign.update.mockResolvedValue(mockUpdatedCampaign);

      const result = await service.updateCampaign('user-123', 'campaign-1', { name: 'Updated Campaign' });

      expect(result).toEqual(mockUpdatedCampaign);
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1', userId: 'user-123' },
        data: { name: 'Updated Campaign' },
        include: campaignDetailsInclude,
      });
    });

    it('should update multiple fields at once', async () => {
      const updated = { ...mockUpdatedCampaign, audience: 'developers', status: 'ACTIVE' };
      prisma.campaign.update.mockResolvedValue(updated);

      const result = await service.updateCampaign('user-123', 'campaign-1', {
        name: 'Updated Campaign',
        audience: 'developers',
        status: 'ACTIVE',
      });

      expect(result).toEqual(updated);
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1', userId: 'user-123' },
        data: { name: 'Updated Campaign', audience: 'developers', status: 'ACTIVE' },
        include: campaignDetailsInclude,
      });
    });

    it('should convert startDate and endDate strings to Date objects', async () => {
      prisma.campaign.update.mockResolvedValue(mockUpdatedCampaign);

      await service.updateCampaign('user-123', 'campaign-1', {
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-06-01'),
      });

      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1', userId: 'user-123' },
        data: {
          startDate: new Date('2026-05-01'),
          endDate: new Date('2026-06-01'),
        },
        include: campaignDetailsInclude,
      });
    });

    it('should allow setting dates to null', async () => {
      prisma.campaign.update.mockResolvedValue(mockUpdatedCampaign);

      await service.updateCampaign('user-123', 'campaign-1', {
        startDate: null,
        endDate: null,
      });

      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1', userId: 'user-123' },
        data: { startDate: null, endDate: null },
        include: campaignDetailsInclude,
      });
    });

    it('should not include fields that are not in the dto', async () => {
      prisma.campaign.update.mockResolvedValue(mockUpdatedCampaign);

      await service.updateCampaign('user-123', 'campaign-1', { notes: 'some notes' });

      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1', userId: 'user-123' },
        data: { notes: 'some notes' },
        include: campaignDetailsInclude,
      });
    });

    it('should propagate error when campaign is not found', async () => {
      prisma.campaign.update.mockRejectedValue(new Error('Record not found'));

      await expect(
        service.updateCampaign('user-123', 'nonexistent-id', { name: 'Test' }),
      ).rejects.toThrow('Record not found');
    });
  });

  describe('deleteCampaign', () => {
    it('should delete a campaign by id and userId', async () => {
      const mockDeleted = {
        id: 'campaign-1',
        name: 'Deleted Campaign',
        userId: 'user-123',
        status: 'DRAFT',
      };
      prisma.campaign.delete.mockResolvedValue(mockDeleted);

      const result = await service.deleteCampaign('campaign-1', 'user-123');

      expect(result).toEqual(mockDeleted);
      expect(prisma.campaign.delete).toHaveBeenCalledWith({
        where: {
          id: 'campaign-1',
          userId: 'user-123',
        },
      });
    });

    it('should propagate error when campaign is not found', async () => {
      prisma.campaign.delete.mockRejectedValue(
        new Error('Record to delete does not exist.'),
      );

      await expect(
        service.deleteCampaign('nonexistent-id', 'user-123'),
      ).rejects.toThrow('Record to delete does not exist.');
    });
  });
});
