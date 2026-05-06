import { ContributionStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateContributionStatusDto {
  @IsEnum(ContributionStatus)
  status!: ContributionStatus;
}
