import {
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CampaignGoalsService } from './campaign-goals.service';
import { CampaignGoal } from '@sm-campaigns-app/datatypes';

@UseGuards(AuthGuard)
@Controller('campaign-goals')
export class CampaignGoalsController {
  private readonly logger = new Logger(CampaignGoalsController.name);
  constructor(private campaignGoalsService: CampaignGoalsService) {}

  @Get()
  async getCampaignGoals(): Promise<CampaignGoal[]> {
    try {
      return await this.campaignGoalsService.getCampaignGoals();
    } catch (error) {
      this.logger.error('Error fetching campaign goals: ', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed fetching campaign goals');
    }
  }
}
