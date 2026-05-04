import { Type, Transform, TransformFnParams } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const trimRequiredString = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimOptionalString = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const normalizeOptionalEmail = (value: unknown): unknown => {
  const trimmedValue = trimOptionalString(value);
  return typeof trimmedValue === 'string'
    ? trimmedValue.toLowerCase()
    : trimmedValue;
};

export class ImportedPersonDto {
  @Transform(({ value }: TransformFnParams): unknown =>
    trimRequiredString(value as unknown),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  fullName!: string;

  @IsString()
  @Matches(DATE_ONLY_PATTERN)
  birthDate!: string;

  @Transform(({ value }: TransformFnParams): unknown =>
    normalizeOptionalEmail(value as unknown),
  )
  @IsOptional()
  @IsEmail()
  email?: string;

  @Transform(({ value }: TransformFnParams): unknown =>
    trimOptionalString(value as unknown),
  )
  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;
}

export class ImportedGiftHistoryDto {
  @Transform(({ value }: TransformFnParams): unknown =>
    trimOptionalString(value as unknown),
  )
  @IsOptional()
  @IsString()
  @MaxLength(200)
  giftName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2200)
  year?: number;

  @Transform(({ value }: TransformFnParams): unknown =>
    trimOptionalString(value as unknown),
  )
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class CommitPeopleImportRowDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rowNumber?: number;

  @ValidateNested()
  @Type(() => ImportedPersonDto)
  person!: ImportedPersonDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ImportedGiftHistoryDto)
  giftHistory?: ImportedGiftHistoryDto | null;
}

export class CommitPeopleImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitPeopleImportRowDto)
  rows!: CommitPeopleImportRowDto[];
}
