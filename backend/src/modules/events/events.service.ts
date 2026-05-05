import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CelebrationEvent,
  EventStatus,
  Person,
  Prisma,
  User,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TeamsService } from '../teams/teams.service';
import { CreateEventDto } from './dto/create-event.dto';
import { GetEventsQueryDto } from './dto/get-events-query.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { UpdateEventDto } from './dto/update-event.dto';

export type CelebrationEventResponse = {
  id: string;
  teamId: string;
  personId: string;
  date: string;
  status: EventStatus;
  budget: number | null;
  createdAt: Date;
  person: {
    id: string;
    fullName: string;
    birthDate: string;
    department: string | null;
    status: string;
  };
  organizer: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type CelebrationEventWithRelations = CelebrationEvent & {
  person: Person;
  organizer?: User | null;
};

const ACTIVE_EVENT_STATUSES: EventStatus[] = [
  EventStatus.PLANNED,
  EventStatus.IN_PROGRESS,
];

@Injectable()
export class EventsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly teamsService: TeamsService,
  ) {}

  async getEvents(
    teamId: string,
    userId: string,
    query: GetEventsQueryDto,
  ): Promise<CelebrationEventResponse[]> {
    await this.teamsService.ensureTeamMember(teamId, userId);

    if (query.personId) {
      await this.findTeamPersonOrThrow(teamId, query.personId);
    }

    const events = await this.prismaService.celebrationEvent.findMany({
      where: {
        teamId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.personId ? { personId: query.personId } : {}),
      },
      include: {
        person: true,
        organizer: true,
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'desc' }],
    });

    return events.map((event) => this.toCelebrationEventResponse(event));
  }

  async createEvent(
    teamId: string,
    userId: string,
    createEventDto: CreateEventDto,
  ): Promise<CelebrationEventResponse> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    await this.findTeamPersonOrThrow(teamId, createEventDto.personId);

    const eventDate = this.parseDateOnly(createEventDto.date);
    const duplicateEvent = await this.prismaService.celebrationEvent.findFirst({
      where: {
        teamId,
        personId: createEventDto.personId,
        date: eventDate,
        status: {
          in: ACTIVE_EVENT_STATUSES,
        },
      },
      include: {
        person: true,
        organizer: true,
      },
    });

    if (duplicateEvent) {
      throw new ConflictException(
        'Активная инициатива поздравления на эту дату уже существует',
      );
    }

    const event = await this.prismaService.celebrationEvent.create({
      data: {
        teamId,
        personId: createEventDto.personId,
        date: eventDate,
        budget: createEventDto.budget,
        organizerId: userId,
        status: EventStatus.PLANNED,
      },
      include: {
        person: true,
        organizer: true,
      },
    });

    return this.toCelebrationEventResponse(event);
  }

  async getEvent(
    teamId: string,
    userId: string,
    eventId: string,
  ): Promise<CelebrationEventResponse> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    const event = await this.findTeamEventOrThrow(teamId, eventId);

    return this.toCelebrationEventResponse(event);
  }

  async updateEvent(
    teamId: string,
    userId: string,
    eventId: string,
    updateEventDto: UpdateEventDto,
  ): Promise<CelebrationEventResponse> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    await this.findTeamEventOrThrow(teamId, eventId);

    const data: Prisma.CelebrationEventUpdateInput = {};

    if (updateEventDto.date !== undefined) {
      data.date = this.parseDateOnly(updateEventDto.date);
    }

    if (updateEventDto.budget !== undefined) {
      data.budget = updateEventDto.budget;
    }

    const event = await this.prismaService.celebrationEvent.update({
      where: { id: eventId },
      data,
      include: {
        person: true,
        organizer: true,
      },
    });

    return this.toCelebrationEventResponse(event);
  }

  async updateEventStatus(
    teamId: string,
    userId: string,
    eventId: string,
    updateEventStatusDto: UpdateEventStatusDto,
  ): Promise<CelebrationEventResponse> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    await this.findTeamEventOrThrow(teamId, eventId);

    const event = await this.prismaService.celebrationEvent.update({
      where: { id: eventId },
      data: {
        status: updateEventStatusDto.status,
      },
      include: {
        person: true,
        organizer: true,
      },
    });

    return this.toCelebrationEventResponse(event);
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

  private async findTeamEventOrThrow(
    teamId: string,
    eventId: string,
  ): Promise<CelebrationEventWithRelations> {
    const event = await this.prismaService.celebrationEvent.findFirst({
      where: {
        id: eventId,
        teamId,
      },
      include: {
        person: true,
        organizer: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Инициатива поздравления не найдена');
    }

    return event;
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

  private toCelebrationEventResponse(
    event: CelebrationEventWithRelations,
  ): CelebrationEventResponse {
    return {
      id: event.id,
      teamId: event.teamId,
      personId: event.personId,
      date: this.formatDateOnly(event.date),
      status: event.status,
      budget: event.budget === null ? null : Number(event.budget),
      createdAt: event.createdAt,
      person: {
        id: event.person.id,
        fullName: event.person.fullName,
        birthDate: this.formatDateOnly(event.person.birthDate),
        department: event.person.department,
        status: event.person.status,
      },
      organizer: event.organizer
        ? {
            id: event.organizer.id,
            name: event.organizer.name,
            email: event.organizer.email,
          }
        : null,
    };
  }

  private formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
