import { Controller, Get } from '@nestjs/common';

type HealthResponse = {
  status: 'ok';
  service: string;
};

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'pozdravlyashka-api',
    };
  }
}
