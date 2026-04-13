import { Module } from '@nestjs/common';
import { CampaignGoalsController } from './campaign-goals.controller';
import { CampaignGoalsService } from './campaign-goals.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CampaignGoalsController],
  providers: [CampaignGoalsService],
})
export class CampaignGoalsModule {}
