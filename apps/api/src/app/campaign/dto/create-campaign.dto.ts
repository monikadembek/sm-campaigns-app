import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsInt()
  goalId!: number;
}
