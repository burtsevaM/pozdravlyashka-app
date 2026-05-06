import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CelebrationEvent,
  EventOccasion,
  EventStatus,
  GiftIdea,
  GiftHistory,
  Person,
  PersonStatus,
  Prisma,
  User,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TeamsService } from '../teams/teams.service';
import { CreateGiftHistoryDto } from './dto/create-gift-history.dto';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdateGiftHistoryDto } from './dto/update-gift-history.dto';
import { UpdatePersonDto } from './dto/update-person.dto';

export type GiftHistoryResponse = {
  id: string;
  year: number | null;
  occasion: string | null;
  giftName: string;
  amount: number | null;
  organizerName: string | null;
  comment: string | null;
};

export type PersonEventResponse = {
  id: string;
  teamId: string;
  personId: string;
  date: string;
  status: EventStatus;
  occasion: EventOccasion;
  budget: number | null;
  selectedGiftIdeaId: string | null;
  selectedGiftIdea: {
    id: string;
    title: string;
    description: string | null;
    price: number | null;
    link: string | null;
  } | null;
  createdAt: Date;
  organizer: {
    id: string;
    name: string;
    email: string;
  } | null;
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
  celebrationEvents: PersonEventResponse[];
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
  events?: PersonEvent[];
};

type PersonEvent = CelebrationEvent & {
  organizer?: User | null;
  selectedGiftIdea?: GiftIdea | null;
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

  async getGiftHistory(
    teamId: string,
    userId: string,
    personId: string,
  ): Promise<GiftHistoryResponse[]> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    await this.findTeamPersonOrThrow(teamId, personId);

    const giftHistory = await this.prismaService.giftHistory.findMany({
      where: { personId },
      orderBy: this.giftHistoryOrderBy(),
    });

    return giftHistory.map((item) => this.toGiftHistoryResponse(item));
  }

  async createGiftHistory(
    teamId: string,
    userId: string,
    personId: string,
    createGiftHistoryDto: CreateGiftHistoryDto,
  ): Promise<GiftHistoryResponse> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    await this.findTeamPersonOrThrow(teamId, personId);

    const giftHistory = await this.prismaService.giftHistory.create({
      data: {
        personId,
        giftName: createGiftHistoryDto.giftName,
        year: createGiftHistoryDto.year,
        occasion: createGiftHistoryDto.occasion ?? '',
        amount: createGiftHistoryDto.amount,
        organizerName: createGiftHistoryDto.organizerName,
        comment: createGiftHistoryDto.comment,
      },
    });

    return this.toGiftHistoryResponse(giftHistory);
  }

  async updateGiftHistory(
    teamId: string,
    userId: string,
    personId: string,
    giftHistoryId: string,
    updateGiftHistoryDto: UpdateGiftHistoryDto,
  ): Promise<GiftHistoryResponse> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    await this.findTeamPersonOrThrow(teamId, personId);
    await this.findPersonGiftHistoryOrThrow(personId, giftHistoryId);

    const data: Prisma.GiftHistoryUpdateInput = {};

    if (updateGiftHistoryDto.giftName !== undefined) {
      data.giftName = updateGiftHistoryDto.giftName;
    }

    if (updateGiftHistoryDto.year !== undefined) {
      data.year = updateGiftHistoryDto.year;
    }

    if (updateGiftHistoryDto.occasion !== undefined) {
      data.occasion = updateGiftHistoryDto.occasion ?? '';
    }

    if (updateGiftHistoryDto.amount !== undefined) {
      data.amount = updateGiftHistoryDto.amount;
    }

    if (updateGiftHistoryDto.organizerName !== undefined) {
      data.organizerName = updateGiftHistoryDto.organizerName;
    }

    if (updateGiftHistoryDto.comment !== undefined) {
      data.comment = updateGiftHistoryDto.comment;
    }

    const giftHistory = await this.prismaService.giftHistory.update({
      where: { id: giftHistoryId },
      data,
    });

    return this.toGiftHistoryResponse(giftHistory);
  }

  async deleteGiftHistory(
    teamId: string,
    userId: string,
    personId: string,
    giftHistoryId: string,
  ): Promise<void> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    await this.findTeamPersonOrThrow(teamId, personId);
    await this.findPersonGiftHistoryOrThrow(personId, giftHistoryId);

    await this.prismaService.giftHistory.delete({
      where: { id: giftHistoryId },
    });
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
          orderBy: this.giftHistoryOrderBy(),
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

    if (!person) {
      throw new NotFoundException('Участник не найден');
    }

    return person;
  }

  private async findPersonGiftHistoryOrThrow(
    personId: string,
    giftHistoryId: string,
  ): Promise<GiftHistory> {
    const giftHistory = await this.prismaService.giftHistory.findFirst({
      where: {
        id: giftHistoryId,
        personId,
      },
    });

    if (!giftHistory) {
      throw new NotFoundException('Запись истории подарков не найдена');
    }

    return giftHistory;
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
      celebrationEvents: (person.events ?? []).map((event) =>
        this.toPersonEventResponse(event),
      ),
    };
  }

  private toGiftHistoryResponse(giftHistory: GiftHistory): GiftHistoryResponse {
    return {
      id: giftHistory.id,
      year: giftHistory.year,
      occasion: giftHistory.occasion || null,
      giftName: giftHistory.giftName,
      amount: giftHistory.amount === null ? null : Number(giftHistory.amount),
      organizerName: giftHistory.organizerName,
      comment: giftHistory.comment,
    };
  }

  private toPersonEventResponse(event: PersonEvent): PersonEventResponse {
    return {
      id: event.id,
      teamId: event.teamId,
      personId: event.personId,
      date: this.formatDateOnly(event.date),
      status: event.status,
      occasion: event.occasion,
      budget: event.budget === null ? null : Number(event.budget),
      selectedGiftIdeaId: event.selectedGiftIdeaId,
      selectedGiftIdea: event.selectedGiftIdea
        ? {
            id: event.selectedGiftIdea.id,
            title: event.selectedGiftIdea.title,
            description: event.selectedGiftIdea.description,
            price:
              event.selectedGiftIdea.price === null
                ? null
                : Number(event.selectedGiftIdea.price),
            link: event.selectedGiftIdea.link,
          }
        : null,
      createdAt: event.createdAt,
      organizer: event.organizer
        ? {
            id: event.organizer.id,
            name: event.organizer.name,
            email: event.organizer.email,
          }
        : null,
    };
  }

  private giftHistoryOrderBy(): Prisma.GiftHistoryOrderByWithRelationInput[] {
    return [
      {
        year: {
          sort: 'desc',
          nulls: 'last',
        },
      },
      { giftName: 'asc' },
    ];
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
