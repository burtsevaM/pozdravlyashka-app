import { Injectable } from '@nestjs/common';

@Injectable()
export class GiftsService {
  getModuleName(): string {
    return 'gifts';
  }
}
