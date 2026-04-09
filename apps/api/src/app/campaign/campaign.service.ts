import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  Campaign,
  CampaignSummary,
  CreateCampaignRequest,
} from '@sm-campaigns-app/datatypes';

@Injectable()
export class CampaignService {
  constructor(private prisma: PrismaService) {}

  async getCampaigns(userId: string): Promise<CampaignSummary[]> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { userId },
      select: { id: true, name: true, status: true },
      orderBy: { updatedAt: 'desc' },
    });
    return campaigns;
  }

  async getCampaignsFull(userId: string): Promise<Campaign[]> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { userId },
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
    return campaigns;
  }

  async getCampaign(id: string, userId: string): Promise<Campaign | null> {
    const campaign = await this.prisma.campaign.findUnique({
      where: {
        id,
        userId,
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
    return campaign;
  }

  async createCampaign(
    userId: string,
    data: CreateCampaignRequest,
  ): Promise<CampaignSummary> {
    const campaign = await this.prisma.campaign.create({
      data: {
        name: data.name,
        goalId: data.goalId,
        userId,
      },
      select: { id: true, name: true, status: true },
    });
    return campaign;
  }

  async deleteCampaign(id: string, userId: string) {
    const deleteCampaign = await this.prisma.campaign.delete({
      where: {
        id,
        userId,
      },
    });
    return deleteCampaign;
  }
}
