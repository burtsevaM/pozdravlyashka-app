import { HealthController } from './health.controller';

describe('HealthController', () => {
  const prismaService = {
    $queryRaw: jest.fn(),
  };

  it('returns service health status', () => {
    const controller = new HealthController(prismaService as never);

    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'pozdravlyashka-api',
    });
  });

  it('returns database health status', async () => {
    prismaService.$queryRaw.mockResolvedValueOnce([{ value: 1 }]);
    const controller = new HealthController(prismaService as never);

    await expect(controller.getDatabaseHealth()).resolves.toEqual({
      status: 'ok',
      database: 'connected',
    });
  });
});
