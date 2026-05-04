import { Transform, TransformFnParams } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

const normalizeEmail = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class LoginDto {
  @Transform(({ value }: TransformFnParams): unknown =>
    normalizeEmail(value as unknown),
  )
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
