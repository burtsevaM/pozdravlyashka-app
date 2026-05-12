import { TeamRole } from '@prisma/client';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';

const normalizeEmail = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class AddTeamMemberDto {
  @Transform(({ value }: TransformFnParams): unknown =>
    normalizeEmail(value as unknown),
  )
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(TeamRole)
  role?: TeamRole;
}
