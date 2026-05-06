import { Type } from 'class-transformer';
import { ContributionStatus } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateContributionDto {
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsEnum(ContributionStatus)
  status?: ContributionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
