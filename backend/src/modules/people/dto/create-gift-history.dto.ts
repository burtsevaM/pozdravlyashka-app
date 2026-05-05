import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trimRequiredString = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimOptionalString = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

export class CreateGiftHistoryDto {
  @Transform(({ value }: TransformFnParams): unknown =>
    trimRequiredString(value as unknown),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  giftName!: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1900)
  @Max(2100)
  year?: number;

  @Transform(({ value }: TransformFnParams): unknown =>
    trimOptionalString(value as unknown),
  )
  @IsOptional()
  @IsString()
  @MaxLength(120)
  occasion?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;

  @Transform(({ value }: TransformFnParams): unknown =>
    trimOptionalString(value as unknown),
  )
  @IsOptional()
  @IsString()
  @MaxLength(160)
  organizerName?: string;

  @Transform(({ value }: TransformFnParams): unknown =>
    trimOptionalString(value as unknown),
  )
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
