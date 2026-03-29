import {
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CampaignService } from './campaign.service';
import { CurrentUser } from '../shared/current-user.decorator';
import { CampaignSummary } from '@sm-campaigns-app/datatypes';

@UseGuards(AuthGuard)
@Controller('campaigns')
export class CampaignController {
  private readonly logger = new Logger(CampaignController.name);

  constructor(private campaignService: CampaignService) {}

  @Get()
  async getCampaigns(
    @CurrentUser('id') userId: string,
  ): Promise<CampaignSummary[]> {
    try {
      return await this.campaignService.getCampaigns(userId);
    } catch (error) {
      this.logger.error('Error fetching campaigns: ', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed fetching campaigns');
    }
  }
}
