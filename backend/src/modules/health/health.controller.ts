import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

type HealthResponse = {
  status: 'ok';
  service: string;
};

type DatabaseHealthResponse = {
  status: 'ok';
  database: 'connected';
};

@Controller('health')
export class HealthController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'pozdravlyashka-api',
    };
  }

  @Get('db')
  async getDatabaseHealth(): Promise<DatabaseHealthResponse> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException(
        'Database connection is unavailable',
      );
    }

    return {
      status: 'ok',
      database: 'connected',
    };
  }
}
