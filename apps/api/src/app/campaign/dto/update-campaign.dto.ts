import { CampaignStatus } from '@sm-campaigns-app/datatypes';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CAMPAIGN_STATUS } from '../campaign.constants';

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsInt()
  goalId?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  audience?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.startDate !== null)
  @IsDateString()
  startDate?: Date | null;

  @IsOptional()
  @ValidateIf((o) => o.endDate !== null)
  @IsDateString()
  endDate?: Date | null;

  @IsOptional()
  @IsIn(CAMPAIGN_STATUS)
  status?: CampaignStatus;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
