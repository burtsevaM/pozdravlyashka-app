import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  getModuleName(): string {
    return 'auth';
  }
}
