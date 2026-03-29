import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CampaignSummary } from '@sm-campaigns-app/datatypes';

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
}
