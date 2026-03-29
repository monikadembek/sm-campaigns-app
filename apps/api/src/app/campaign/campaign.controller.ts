import {
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CampaignService } from './campaign.service';
import { CurrentUser } from '../shared/current-user.decorator';
import { CampaignSummary } from '@sm-campaigns-app/datatypes';
import { CreateCampaignDto } from './dto/create-campaign.dto';

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

  @Post()
  async createCampaign(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCampaignDto,
  ): Promise<CampaignSummary> {
    try {
      return await this.campaignService.createCampaign(userId, dto);
    } catch (error) {
      this.logger.error('Error creating campaign: ', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed creating campaign');
    }
  }
}
