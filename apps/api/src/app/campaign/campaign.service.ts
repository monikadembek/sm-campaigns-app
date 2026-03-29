import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
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
}
