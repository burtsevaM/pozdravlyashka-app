import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

export class UpdatePersonDto {
  @Transform(({ value }: TransformFnParams): unknown =>
    trimOptionalString(value as unknown),
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  fullName?: string;

  @Transform(({ value }: TransformFnParams): unknown =>
    normalizeOptionalEmail(value as unknown),
  )
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_PATTERN)
  birthDate?: string;

  @Transform(({ value }: TransformFnParams): unknown =>
    trimOptionalString(value as unknown),
  )
  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @Transform(({ value }: TransformFnParams): unknown =>
    trimOptionalString(value as unknown),
  )
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  preferences?: string;

  @Transform(({ value }: TransformFnParams): unknown =>
    trimOptionalString(value as unknown),
  )
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
