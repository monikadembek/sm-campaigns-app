import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CampaignGoal } from '@sm-campaigns-app/datatypes';

@Injectable()
export class CampaignGoalsService {
  constructor(private prisma: PrismaService) {}

  async getCampaignGoals(): Promise<CampaignGoal[]> {
    return await this.prisma.campaignGoal.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }
}
