import { Injectable } from '@nestjs/common';

@Injectable()
export class EventsService {
  getModuleName(): string {
    return 'events';
  }
}
