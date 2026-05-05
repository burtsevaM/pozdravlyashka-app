import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GiftHistory, Person, PersonStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TeamsService } from '../teams/teams.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';

export type GiftHistoryResponse = {
  id: string;
  year: number | null;
  occasion: string;
  giftName: string;
  amount: number | null;
  organizerName: string | null;
  comment: string | null;
};

export type PersonResponse = {
  id: string;
  teamId: string;
  fullName: string;
  email: string | null;
  birthDate: string;
  department: string | null;
  status: PersonStatus;
  preferences: string | null;
  notes: string | null;
  createdAt: Date;
  giftHistory: GiftHistoryResponse[];
};

export type UpcomingBirthdayResponse = {
  id: string;
  fullName: string;
  email: string | null;
  birthDate: string;
  department: string | null;
  nextBirthday: string;
  daysUntil: number;
};

type PersonWithBirthdayDistance = {
  person: Person;
  nextBirthday: Date;
  daysUntil: number;
};

type PersonWithGiftHistory = Person & {
  giftHistory?: GiftHistory[];
};

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class PeopleService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly teamsService: TeamsService,
  ) {}

  async createPerson(
    teamId: string,
    userId: string,
    createPersonDto: CreatePersonDto,
  ): Promise<PersonResponse> {
    await this.teamsService.ensureTeamMember(teamId, userId);

    const person = await this.prismaService.person.create({
      data: {
        teamId,
        fullName: createPersonDto.fullName,
        email: createPersonDto.email,
        birthDate: this.parseDateOnly(createPersonDto.birthDate),
        department: createPersonDto.department,
        preferences: createPersonDto.preferences,
        notes: createPersonDto.notes,
        status: PersonStatus.ACTIVE,
      },
    });

    return this.toPersonResponse(person);
  }

  async getPeople(
    teamId: string,
    userId: string,
    includeArchived: boolean,
  ): Promise<PersonResponse[]> {
    await this.teamsService.ensureTeamMember(teamId, userId);

    const people = await this.prismaService.person.findMany({
      where: {
        teamId,
        ...(includeArchived ? {} : { status: PersonStatus.ACTIVE }),
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

    return people.map((person) => this.toPersonResponse(person));
  }

  async getPerson(
    teamId: string,
    userId: string,
    personId: string,
  ): Promise<PersonResponse> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    const person = await this.findTeamPersonWithGiftHistoryOrThrow(
      teamId,
      personId,
    );

    return this.toPersonResponse(person);
  }

  async updatePerson(
    teamId: string,
    userId: string,
    personId: string,
    updatePersonDto: UpdatePersonDto,
  ): Promise<PersonResponse> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    await this.findTeamPersonOrThrow(teamId, personId);

    const data: Prisma.PersonUpdateInput = {};

    if (updatePersonDto.fullName !== undefined) {
      data.fullName = updatePersonDto.fullName;
    }

    if (updatePersonDto.email !== undefined) {
      data.email = updatePersonDto.email;
    }

    if (updatePersonDto.birthDate !== undefined) {
      data.birthDate = this.parseDateOnly(updatePersonDto.birthDate);
    }

    if (updatePersonDto.department !== undefined) {
      data.department = updatePersonDto.department;
    }

    if (updatePersonDto.preferences !== undefined) {
      data.preferences = updatePersonDto.preferences;
    }

    if (updatePersonDto.notes !== undefined) {
      data.notes = updatePersonDto.notes;
    }

    const person = await this.prismaService.person.update({
      where: { id: personId },
      data,
    });

    return this.toPersonResponse(person);
  }

  async archivePerson(
    teamId: string,
    userId: string,
    personId: string,
  ): Promise<PersonResponse> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    await this.findTeamPersonOrThrow(teamId, personId);

    const person = await this.prismaService.person.update({
      where: { id: personId },
      data: {
        status: PersonStatus.ARCHIVED,
      },
    });

    return this.toPersonResponse(person);
  }

  async getUpcomingBirthdays(
    teamId: string,
    userId: string,
    rawDays: string | undefined,
    today = new Date(),
  ): Promise<UpcomingBirthdayResponse[]> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    const days = this.parseUpcomingDays(rawDays);

    const people = await this.prismaService.person.findMany({
      where: {
        teamId,
        status: PersonStatus.ACTIVE,
      },
      orderBy: [{ fullName: 'asc' }],
    });

    const currentDate = this.toUtcDateOnly(today);

    return people
      .map((person) => this.withBirthdayDistance(person, currentDate))
      .filter(({ daysUntil }) => daysUntil <= days)
      .sort((left, right) => {
        if (left.daysUntil !== right.daysUntil) {
          return left.daysUntil - right.daysUntil;
        }

        return left.person.fullName.localeCompare(right.person.fullName);
      })
      .map(({ person, nextBirthday, daysUntil }) => ({
        id: person.id,
        fullName: person.fullName,
        email: person.email,
        birthDate: this.formatDateOnly(person.birthDate),
        department: person.department,
        nextBirthday: this.formatDateOnly(nextBirthday),
        daysUntil,
      }));
  }

  calculateUpcomingBirthdaysForPeople(
    people: Person[],
    days: number,
    today: Date,
  ): UpcomingBirthdayResponse[] {
    const currentDate = this.toUtcDateOnly(today);

    return people
      .filter((person) => person.status === PersonStatus.ACTIVE)
      .map((person) => this.withBirthdayDistance(person, currentDate))
      .filter(({ daysUntil }) => daysUntil <= days)
      .sort((left, right) => left.daysUntil - right.daysUntil)
      .map(({ person, nextBirthday, daysUntil }) => ({
        id: person.id,
        fullName: person.fullName,
        email: person.email,
        birthDate: this.formatDateOnly(person.birthDate),
        department: person.department,
        nextBirthday: this.formatDateOnly(nextBirthday),
        daysUntil,
      }));
  }

  private async findTeamPersonOrThrow(
    teamId: string,
    personId: string,
  ): Promise<Person> {
    const person = await this.prismaService.person.findFirst({
      where: {
        id: personId,
        teamId,
      },
    });

    if (!person) {
      throw new NotFoundException('Участник не найден');
    }

    return person;
  }

  private async findTeamPersonWithGiftHistoryOrThrow(
    teamId: string,
    personId: string,
  ): Promise<PersonWithGiftHistory> {
    const person = await this.prismaService.person.findFirst({
      where: {
        id: personId,
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
      },
    });

    if (!person) {
      throw new NotFoundException('Участник не найден');
    }

    return person;
  }

  private parseUpcomingDays(rawDays: string | undefined): number {
    if (rawDays === undefined) {
      return 30;
    }

    const days = Number(rawDays);

    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new BadRequestException(
        'days должен быть целым числом от 1 до 365',
      );
    }

    return days;
  }

  private parseDateOnly(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException(
        'Дата должна существовать и иметь формат YYYY-MM-DD',
      );
    }

    return date;
  }

  private toPersonResponse(person: PersonWithGiftHistory): PersonResponse {
    return {
      id: person.id,
      teamId: person.teamId,
      fullName: person.fullName,
      email: person.email,
      birthDate: this.formatDateOnly(person.birthDate),
      department: person.department,
      status: person.status,
      preferences: person.preferences,
      notes: person.notes,
      createdAt: person.createdAt,
      giftHistory: (person.giftHistory ?? []).map((giftHistory) =>
        this.toGiftHistoryResponse(giftHistory),
      ),
    };
  }

  private toGiftHistoryResponse(giftHistory: GiftHistory): GiftHistoryResponse {
    return {
      id: giftHistory.id,
      year: giftHistory.year,
      occasion: giftHistory.occasion,
      giftName: giftHistory.giftName,
      amount: giftHistory.amount === null ? null : Number(giftHistory.amount),
      organizerName: giftHistory.organizerName,
      comment: giftHistory.comment,
    };
  }

  private withBirthdayDistance(
    person: Person,
    currentDate: Date,
  ): PersonWithBirthdayDistance {
    const birthMonth = person.birthDate.getUTCMonth();
    const birthDay = person.birthDate.getUTCDate();
    let nextBirthday = new Date(
      Date.UTC(currentDate.getUTCFullYear(), birthMonth, birthDay),
    );

    if (nextBirthday.getTime() < currentDate.getTime()) {
      nextBirthday = new Date(
        Date.UTC(currentDate.getUTCFullYear() + 1, birthMonth, birthDay),
      );
    }

    const daysUntil = Math.round(
      (nextBirthday.getTime() - currentDate.getTime()) / MILLISECONDS_IN_DAY,
    );

    return {
      person,
      nextBirthday,
      daysUntil,
    };
  }

  private toUtcDateOnly(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
