import { Module } from '@nestjs/common';
import { GiftsService } from './gifts.service';

@Module({
  providers: [GiftsService],
  exports: [GiftsService],
})
export class GiftsModule {}
