import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CampaignService } from './campaign.service';
import { CurrentUser } from '../shared/current-user.decorator';
import {
  Campaign,
  CampaignDetails,
  CampaignSummary,
} from '@sm-campaigns-app/datatypes';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { Prisma } from '../../generated/prisma/client';

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

  @Get('full')
  async getCampaignsFull(
    @CurrentUser('id') userId: string,
  ): Promise<Campaign[]> {
    try {
      return await this.campaignService.getCampaignsFull(userId);
    } catch (error) {
      this.logger.error('Error fetching campaigns: ', error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed fetching campaigns');
    }
  }

  @Get(':id')
  async getSingleCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<CampaignDetails | null> {
    try {
      const campaign = await this.campaignService.getCampaign(id, userId);
      if (!campaign) {
        throw new NotFoundException(`Campaign with id: ${id} not found`);
      }
      return campaign;
    } catch (error) {
      this.logger.error(`Error fetching campaign with id: ${id}: `, error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed fetching campaign with id: ${id}`,
      );
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

  @Patch(':id')
  async editCampaign(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ): Promise<CampaignDetails> {
    try {
      return await this.campaignService.updateCampaign(
        userId,
        id,
        updateCampaignDto,
      );
    } catch (error) {
      this.logger.error(`Error updating campaign with id ${id}: `, error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Campaign with id: ${id} not found`);
      }
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Failed updating campaign with id ${id}`,
      );
    }
  }

  @Delete(':id')
  async deleteCampaign(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<string> {
    try {
      await this.campaignService.deleteCampaign(id, userId);
      return `Campaign with id: ${id} was successfully deleted`;
    } catch (error) {
      this.logger.error(`Error when deleting campaign with id ${id}: `, error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Campaign with id: ${id} not found`);
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed deleting campaign with id ${id}`,
      );
    }
  }
}
