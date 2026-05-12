import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

const trimString = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;
const normalizeEmail = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class RegisterDto {
  @Transform(({ value }: TransformFnParams): unknown =>
    trimString(value as unknown),
  )
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Transform(({ value }: TransformFnParams): unknown =>
    normalizeEmail(value as unknown),
  )
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @Transform(({ value }: TransformFnParams): unknown =>
    trimString(value as unknown),
  )
  @IsString()
  @IsNotEmpty()
  @Matches(DATE_ONLY_PATTERN, {
    message: 'Дата рождения должна быть в формате YYYY-MM-DD',
  })
  birthDate!: string;
}
