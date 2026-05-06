import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateDelegationDto {
  @IsUUID()
  toUserId!: string;

  @IsString()
  @Matches(DATE_ONLY_PATTERN)
  startDate!: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_PATTERN)
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
