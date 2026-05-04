import { Injectable } from '@nestjs/common';

@Injectable()
export class TeamsService {
  getModuleName(): string {
    return 'teams';
  }
}
