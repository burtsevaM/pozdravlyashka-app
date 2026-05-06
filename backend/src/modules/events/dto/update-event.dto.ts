import { Type } from 'class-transformer';
import { EventOccasion } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_PATTERN)
  date?: string;

  @IsOptional()
  @IsEnum(EventOccasion)
  occasion?: EventOccasion;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budget?: number;
}
