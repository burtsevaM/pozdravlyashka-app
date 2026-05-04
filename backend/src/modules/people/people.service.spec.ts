import { Person, PersonStatus } from '@prisma/client';
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

type PersonFactoryOptions = {
  id?: string;
  fullName?: string;
  birthDate?: string;
  status?: PersonStatus;
};

const createPerson = ({
  id = 'person-id',
  fullName = 'Иванова Анна',
  birthDate = '2005-05-05',
  status = PersonStatus.ACTIVE,
}: PersonFactoryOptions): Person => ({
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
});
