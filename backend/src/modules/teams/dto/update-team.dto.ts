import { Transform, TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trimString = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateTeamDto {
  @Transform(({ value }: TransformFnParams): unknown =>
    trimString(value as unknown),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}
