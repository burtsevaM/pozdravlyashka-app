import { GiftHistory, Person, PersonStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TeamsService } from '../teams/teams.service';
import { PeopleService } from './people.service';

describe('PeopleService birthdays', () => {
  const service = new PeopleService({} as PrismaService, {} as TeamsService);

  it('returns birthday today with zero days until', () => {
    const result = service.calculateUpcomingBirthdaysForPeople(
      [createPerson({ birthDate: '2005-05-05' })],
      30,
      new Date('2026-05-05T12:00:00.000Z'),
    );

    expect(result).toEqual([
      expect.objectContaining({
        birthDate: '2005-05-05',
        nextBirthday: '2026-05-05',
        daysUntil: 0,
      }),
    ]);
  });

  it('returns birthday in a few days', () => {
    const result = service.calculateUpcomingBirthdaysForPeople(
      [createPerson({ birthDate: '2005-05-10' })],
      30,
      new Date('2026-05-05T00:00:00.000Z'),
    );

    expect(result[0]).toEqual(
      expect.objectContaining({
        nextBirthday: '2026-05-10',
        daysUntil: 5,
      }),
    );
  });

  it('moves passed birthday to the next year', () => {
    const result = service.calculateUpcomingBirthdaysForPeople(
      [createPerson({ birthDate: '2005-05-01' })],
      365,
      new Date('2026-05-05T00:00:00.000Z'),
    );

    expect(result[0]).toEqual(
      expect.objectContaining({
        nextBirthday: '2027-05-01',
        daysUntil: 361,
      }),
    );
  });

  it('filters birthdays by requested days', () => {
    const result = service.calculateUpcomingBirthdaysForPeople(
      [
        createPerson({ id: 'soon', fullName: 'Soon', birthDate: '2005-05-10' }),
        createPerson({ id: 'late', fullName: 'Late', birthDate: '2005-06-10' }),
      ],
      10,
      new Date('2026-05-05T00:00:00.000Z'),
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('soon');
  });

  it('does not return archived people', () => {
    const result = service.calculateUpcomingBirthdaysForPeople(
      [
        createPerson({
          id: 'archived',
          birthDate: '2005-05-05',
          status: PersonStatus.ARCHIVED,
        }),
      ],
      30,
      new Date('2026-05-05T00:00:00.000Z'),
    );

    expect(result).toEqual([]);
  });
});

describe('PeopleService gift history responses', () => {
  const teamId = 'team-id';
  const userId = 'user-id';

  let findMany: jest.Mock;
  let findFirst: jest.Mock;
  let ensureTeamMember: jest.Mock;
  let service: PeopleService;

  beforeEach(() => {
    findMany = jest.fn();
    findFirst = jest.fn();
    ensureTeamMember = jest.fn().mockResolvedValue(undefined);

    service = new PeopleService(
      {
        person: {
          findMany,
          findFirst,
        },
      } as unknown as PrismaService,
      {
        ensureTeamMember,
      } as unknown as TeamsService,
    );
  });

  it('returns gift history with people list', async () => {
    findMany.mockResolvedValue([
      createPerson({
        giftHistory: [
          createGiftHistory({
            year: 2025,
            giftName: 'Сертификат Ozon',
            comment: 'Подарок от группы',
          }),
        ],
      }),
    ]);

    const result = await service.getPeople(teamId, userId, false);

    expect(ensureTeamMember).toHaveBeenCalledWith(teamId, userId);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        teamId,
        status: PersonStatus.ACTIVE,
      },
      include: {
        giftHistory: {
          orderBy: [
            {
              year: {
                sort: 'desc',
                nulls: 'last',
              },
            },
            { giftName: 'asc' },
          ],
        },
      },
      orderBy: [{ fullName: 'asc' }, { createdAt: 'asc' }],
    });
    expect(result[0]?.giftHistory).toEqual([
      {
        id: 'gift-history-id',
        year: 2025,
        occasion: 'Birthday',
        giftName: 'Сертификат Ozon',
        amount: null,
        organizerName: null,
        comment: 'Подарок от группы',
      },
    ]);
  });

  it('returns gift history with a single person', async () => {
    findFirst.mockResolvedValue(
      createPerson({
        giftHistory: [
          createGiftHistory({
            amount: new Prisma.Decimal('1500.50'),
          }),
        ],
      }),
    );

    const result = await service.getPerson(teamId, userId, 'person-id');

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'person-id',
        teamId,
      },
      include: {
        giftHistory: {
          orderBy: [
            {
              year: {
                sort: 'desc',
                nulls: 'last',
              },
            },
            { giftName: 'asc' },
          ],
        },
        events: {
          include: {
            organizer: true,
            selectedGiftIdea: true,
          },
          orderBy: [{ date: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });
    expect(result.giftHistory[0]?.amount).toBe(1500.5);
  });
});

type PersonFactoryOptions = {
  id?: string;
  fullName?: string;
  birthDate?: string;
  status?: PersonStatus;
  giftHistory?: GiftHistory[];
};

const createPerson = ({
  id = 'person-id',
  fullName = 'Иванова Анна',
  birthDate = '2005-05-05',
  status = PersonStatus.ACTIVE,
  giftHistory,
}: PersonFactoryOptions): Person & { giftHistory?: GiftHistory[] } => ({
  id,
  teamId: 'team-id',
  fullName,
  email: 'anna@example.com',
  birthDate: new Date(`${birthDate}T00:00:00.000Z`),
  department: 'Группа 102-43',
  status,
  preferences: null,
  notes: null,
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
  giftHistory,
});

type GiftHistoryFactoryOptions = {
  id?: string;
  personId?: string;
  year?: number | null;
  occasion?: string;
  giftName?: string;
  amount?: Prisma.Decimal | null;
  organizerName?: string | null;
  comment?: string | null;
};

const createGiftHistory = ({
  id = 'gift-history-id',
  personId = 'person-id',
  year = 2025,
  occasion = 'Birthday',
  giftName = 'Сертификат Ozon',
  amount = null,
  organizerName = null,
  comment = null,
}: GiftHistoryFactoryOptions = {}): GiftHistory => ({
  id,
  personId,
  year,
  occasion,
  giftName,
  amount,
  organizerName,
  comment,
});
