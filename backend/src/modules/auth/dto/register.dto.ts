import { Transform, TransformFnParams } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

const trimString = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;
const normalizeEmail = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

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
}
