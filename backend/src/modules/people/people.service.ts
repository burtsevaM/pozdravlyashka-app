import { Injectable } from '@nestjs/common';

@Injectable()
export class PeopleService {
  getModuleName(): string {
    return 'people';
  }
}
