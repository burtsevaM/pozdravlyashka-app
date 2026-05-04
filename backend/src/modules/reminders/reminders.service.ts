import { Injectable } from '@nestjs/common';

@Injectable()
export class RemindersService {
  getModuleName(): string {
    return 'reminders';
  }
}
