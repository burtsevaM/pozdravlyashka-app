import { IsOptional, IsUUID } from 'class-validator';

export class AssignDeputyDto {
  @IsOptional()
  @IsUUID()
  deputyId?: string | null;
}
