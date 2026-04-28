import { CampaignStatus } from '@sm-campaigns-app/datatypes';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

import { CAMPAIGN_STATUS } from '../campaign.constants';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsInt()
  goalId!: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(255)
  audience?: string;

  @IsOptional()
  @ValidateIf((o) => o.startDate !== null)
  @IsString()
  startDate?: string;

  @IsOptional()
  @ValidateIf((o) => o.endDate !== null)
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsIn(CAMPAIGN_STATUS)
  status?: CampaignStatus;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
