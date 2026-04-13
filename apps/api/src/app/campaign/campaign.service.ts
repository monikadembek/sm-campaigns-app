import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  Campaign,
  CampaignDetails,
  CampaignSummary,
  CreateCampaignRequest,
} from '@sm-campaigns-app/datatypes';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignService {
  constructor(private prisma: PrismaService) {}

  private campaignDetailsInclude = {
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

  async getCampaign(
    id: string,
    userId: string,
  ): Promise<CampaignDetails | null> {
    const campaign = await this.prisma.campaign.findUnique({
      where: {
        id,
        userId,
      },
      include: this.campaignDetailsInclude,
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

  async updateCampaign(
    userId: string,
    campaignId: string,
    data: UpdateCampaignDto,
  ): Promise<CampaignDetails> {
    const updateData: Record<string, unknown> = {};

    if ('name' in data) updateData.name = data.name;
    if ('goalId' in data) updateData.goalId = data.goalId;
    if ('audience' in data) updateData.audience = data.audience;
    if ('status' in data) updateData.status = data.status;
    if ('notes' in data) updateData.notes = data.notes;

    if ('startDate' in data) {
      updateData.startDate =
        data.startDate === null ? null : new Date(data.startDate);
    }
    if ('endDate' in data) {
      updateData.endDate =
        data.endDate === null ? null : new Date(data.endDate);
    }

    const updatedCampaign = await this.prisma.campaign.update({
      where: {
        id: campaignId,
        userId,
      },
      data: updateData,
      include: this.campaignDetailsInclude,
    });
    return updatedCampaign;
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
