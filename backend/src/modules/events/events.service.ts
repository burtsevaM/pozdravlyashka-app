import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CelebrationEvent,
  EventStatus,
  GiftIdea,
  Person,
  Prisma,
  User,
  Vote,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TeamsService } from '../teams/teams.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateGiftIdeaDto } from './dto/create-gift-idea.dto';
import { GetEventsQueryDto } from './dto/get-events-query.dto';
import { SelectGiftIdeaDto } from './dto/select-gift-idea.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateGiftIdeaDto } from './dto/update-gift-idea.dto';

export type GiftIdeaResponse = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  link: string | null;
  proposedById: string | null;
  proposedByName: string | null;
  voteCount: number;
  votedByCurrentUser: boolean;
  isSelected: boolean;
  createdAt: Date;
};

export type SelectedGiftIdeaResponse = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  link: string | null;
  proposedById: string | null;
  proposedByName: string | null;
} | null;

export type CelebrationEventResponse = {
  id: string;
  teamId: string;
  personId: string;
  date: string;
  status: EventStatus;
  budget: number | null;
  selectedGiftIdeaId: string | null;
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
  selectedGiftIdea: SelectedGiftIdeaResponse;
  giftIdeas: GiftIdeaResponse[];
};

type CelebrationEventWithRelations = CelebrationEvent & {
  person: Person;
  organizer?: User | null;
  selectedGiftIdea?: GiftIdeaWithProposer | null;
  giftIdeas?: GiftIdeaWithVotes[];
};

type GiftIdeaWithProposer = GiftIdea & {
  proposedBy?: User | null;
};

type GiftIdeaWithVotes = GiftIdeaWithProposer & {
  votes?: Vote[];
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
      include: this.eventInclude(),
      orderBy: [{ date: 'asc' }, { createdAt: 'desc' }],
    });

    return events.map((event) =>
      this.toCelebrationEventResponse(event, userId),
    );
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
      include: this.eventInclude(),
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
      include: this.eventInclude(),
    });

    return this.toCelebrationEventResponse(event, userId);
  }

  async getEvent(
    teamId: string,
    userId: string,
    eventId: string,
  ): Promise<CelebrationEventResponse> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    const event = await this.findTeamEventOrThrow(teamId, eventId);

    return this.toCelebrationEventResponse(event, userId);
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
      include: this.eventInclude(),
    });

    return this.toCelebrationEventResponse(event, userId);
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
      include: this.eventInclude(),
    });

    return this.toCelebrationEventResponse(event, userId);
  }

  async getGiftIdeas(
    teamId: string,
    userId: string,
    eventId: string,
  ): Promise<GiftIdeaResponse[]> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    const event = await this.findTeamEventOrThrow(teamId, eventId);

    return (event.giftIdeas ?? []).map((idea) =>
      this.toGiftIdeaResponse(idea, userId, event.selectedGiftIdeaId),
    );
  }

  async createGiftIdea(
    teamId: string,
    userId: string,
    eventId: string,
    createGiftIdeaDto: CreateGiftIdeaDto,
  ): Promise<GiftIdeaResponse[]> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    await this.findTeamEventOrThrow(teamId, eventId);
    const title = this.trimRequiredText(createGiftIdeaDto.title);

    await this.prismaService.giftIdea.create({
      data: {
        eventId,
        title,
        description: this.trimOptionalText(createGiftIdeaDto.description),
        price: createGiftIdeaDto.price,
        link: this.trimOptionalText(createGiftIdeaDto.link),
        proposedById: userId,
      },
    });

    return this.getGiftIdeas(teamId, userId, eventId);
  }

  async updateGiftIdea(
    teamId: string,
    userId: string,
    eventId: string,
    ideaId: string,
    updateGiftIdeaDto: UpdateGiftIdeaDto,
  ): Promise<GiftIdeaResponse[]> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    await this.findTeamEventOrThrow(teamId, eventId);
    await this.findEventGiftIdeaOrThrow(eventId, ideaId);

    const data: Prisma.GiftIdeaUpdateInput = {};

    if (updateGiftIdeaDto.title !== undefined) {
      data.title = this.trimRequiredText(updateGiftIdeaDto.title);
    }

    if (updateGiftIdeaDto.description !== undefined) {
      data.description = this.trimOptionalText(updateGiftIdeaDto.description);
    }

    if (updateGiftIdeaDto.price !== undefined) {
      data.price = updateGiftIdeaDto.price;
    }

    if (updateGiftIdeaDto.link !== undefined) {
      data.link = this.trimOptionalText(updateGiftIdeaDto.link);
    }

    await this.prismaService.giftIdea.update({
      where: { id: ideaId },
      data,
    });

    return this.getGiftIdeas(teamId, userId, eventId);
  }

  async deleteGiftIdea(
    teamId: string,
    userId: string,
    eventId: string,
    ideaId: string,
  ): Promise<GiftIdeaResponse[]> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    const event = await this.findTeamEventOrThrow(teamId, eventId);
    await this.findEventGiftIdeaOrThrow(eventId, ideaId);

    if (event.selectedGiftIdeaId === ideaId) {
      throw new ConflictException('Нельзя удалить итоговый подарок');
    }

    await this.prismaService.giftIdea.delete({
      where: { id: ideaId },
    });

    return this.getGiftIdeas(teamId, userId, eventId);
  }

  async voteForGiftIdea(
    teamId: string,
    userId: string,
    eventId: string,
    ideaId: string,
  ): Promise<GiftIdeaResponse[]> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    await this.findTeamEventOrThrow(teamId, eventId);
    await this.findEventGiftIdeaOrThrow(eventId, ideaId);

    await this.prismaService.vote.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      create: {
        eventId,
        ideaId,
        userId,
      },
      update: {
        ideaId,
      },
    });

    return this.getGiftIdeas(teamId, userId, eventId);
  }

  async removeVote(
    teamId: string,
    userId: string,
    eventId: string,
  ): Promise<GiftIdeaResponse[]> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    await this.findTeamEventOrThrow(teamId, eventId);

    await this.prismaService.vote.deleteMany({
      where: {
        eventId,
        userId,
      },
    });

    return this.getGiftIdeas(teamId, userId, eventId);
  }

  async selectGiftIdea(
    teamId: string,
    userId: string,
    eventId: string,
    selectGiftIdeaDto: SelectGiftIdeaDto,
  ): Promise<CelebrationEventResponse> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    await this.findTeamEventOrThrow(teamId, eventId);
    await this.findEventGiftIdeaOrThrow(eventId, selectGiftIdeaDto.giftIdeaId);

    const event = await this.prismaService.celebrationEvent.update({
      where: { id: eventId },
      data: {
        selectedGiftIdeaId: selectGiftIdeaDto.giftIdeaId,
      },
      include: this.eventInclude(),
    });

    return this.toCelebrationEventResponse(event, userId);
  }

  async clearSelectedGiftIdea(
    teamId: string,
    userId: string,
    eventId: string,
  ): Promise<CelebrationEventResponse> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    await this.findTeamEventOrThrow(teamId, eventId);

    const event = await this.prismaService.celebrationEvent.update({
      where: { id: eventId },
      data: {
        selectedGiftIdeaId: null,
      },
      include: this.eventInclude(),
    });

    return this.toCelebrationEventResponse(event, userId);
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
      include: this.eventInclude(),
    });

    if (!event) {
      throw new NotFoundException('Инициатива поздравления не найдена');
    }

    return event;
  }

  private async findEventGiftIdeaOrThrow(
    eventId: string,
    ideaId: string,
  ): Promise<GiftIdea> {
    const giftIdea = await this.prismaService.giftIdea.findFirst({
      where: {
        id: ideaId,
        eventId,
      },
    });

    if (!giftIdea) {
      throw new NotFoundException('Идея подарка не найдена');
    }

    return giftIdea;
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

  private eventInclude(): Prisma.CelebrationEventInclude {
    return {
      person: true,
      organizer: true,
      selectedGiftIdea: {
        include: {
          proposedBy: true,
        },
      },
      giftIdeas: {
        include: {
          proposedBy: true,
          votes: true,
        },
        orderBy: [{ createdAt: 'asc' }, { title: 'asc' }],
      },
    };
  }

  private toCelebrationEventResponse(
    event: CelebrationEventWithRelations,
    userId: string,
  ): CelebrationEventResponse {
    return {
      id: event.id,
      teamId: event.teamId,
      personId: event.personId,
      date: this.formatDateOnly(event.date),
      status: event.status,
      budget: event.budget === null ? null : Number(event.budget),
      selectedGiftIdeaId: event.selectedGiftIdeaId,
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
      selectedGiftIdea: event.selectedGiftIdea
        ? this.toSelectedGiftIdeaResponse(event.selectedGiftIdea)
        : null,
      giftIdeas: (event.giftIdeas ?? []).map((idea) =>
        this.toGiftIdeaResponse(idea, userId, event.selectedGiftIdeaId),
      ),
    };
  }

  private toGiftIdeaResponse(
    idea: GiftIdeaWithVotes,
    userId: string,
    selectedGiftIdeaId: string | null,
  ): GiftIdeaResponse {
    const votes = idea.votes ?? [];

    return {
      id: idea.id,
      title: idea.title,
      description: idea.description,
      price: idea.price === null ? null : Number(idea.price),
      link: idea.link,
      proposedById: idea.proposedById,
      proposedByName: idea.proposedBy?.name ?? null,
      voteCount: votes.length,
      votedByCurrentUser: votes.some((vote) => vote.userId === userId),
      isSelected: idea.id === selectedGiftIdeaId,
      createdAt: idea.createdAt,
    };
  }

  private toSelectedGiftIdeaResponse(
    idea: GiftIdeaWithProposer,
  ): SelectedGiftIdeaResponse {
    return {
      id: idea.id,
      title: idea.title,
      description: idea.description,
      price: idea.price === null ? null : Number(idea.price),
      link: idea.link,
      proposedById: idea.proposedById,
      proposedByName: idea.proposedBy?.name ?? null,
    };
  }

  private trimOptionalText(value: string | undefined): string | null {
    const trimmedValue = value?.trim();
    return trimmedValue ? trimmedValue : null;
  }

  private trimRequiredText(value: string): string {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      throw new BadRequestException('Название идеи подарка обязательно');
    }

    return trimmedValue;
  }

  private formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
