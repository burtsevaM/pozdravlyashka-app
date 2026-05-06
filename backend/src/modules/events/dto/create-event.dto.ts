import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { EventOccasion } from '@prisma/client';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateEventDto {
  @IsUUID()
  personId!: string;

  @IsString()
  @Matches(DATE_ONLY_PATTERN)
  date!: string;

  @IsOptional()
  @IsEnum(EventOccasion)
  occasion?: EventOccasion;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budget?: number;
}
