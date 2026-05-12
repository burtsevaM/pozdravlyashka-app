import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const trimString = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateProfileDto {
  @Transform(({ value }: TransformFnParams): unknown =>
    trimString(value as unknown),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @Transform(({ value }: TransformFnParams): unknown =>
    trimString(value as unknown),
  )
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_PATTERN, {
    message: 'Дата рождения должна быть в формате YYYY-MM-DD',
  })
  birthDate?: string | null;
}
