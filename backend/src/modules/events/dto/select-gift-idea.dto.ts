import { IsUUID } from 'class-validator';

export class SelectGiftIdeaDto {
  @IsUUID()
  giftIdeaId!: string;
}
