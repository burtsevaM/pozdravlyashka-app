import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CelebrationEvent,
  Contribution,
  ContributionStatus,
  EventOccasion,
  Delegation,
  EventStatus,
  GiftIdea,
  Person,
  Prisma,
  TeamRole,
  User,
  Vote,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TeamsService } from '../teams/teams.service';
import { AssignDeputyDto } from './dto/assign-deputy.dto';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { CreateDelegationDto } from './dto/create-delegation.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateGiftIdeaDto } from './dto/create-gift-idea.dto';
import { GetEventsQueryDto } from './dto/get-events-query.dto';
import { SelectGiftIdeaDto } from './dto/select-gift-idea.dto';
import { UpdateContributionStatusDto } from './dto/update-contribution-status.dto';
import { UpdateContributionDto } from './dto/update-contribution.dto';
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

export type ContributionResponse = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  status: ContributionStatus;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ContributionSummaryResponse = {
  budget: number | null;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paidCount: number;
  pendingCount: number;
  progressPercent: number;
  items: ContributionResponse[];
};

export type DelegationResponse = {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail: string;
  toUserId: string;
  toUserName: string;
  toUserEmail: string;
  startDate: string;
  endDate: string | null;
  reason: string | null;
  active: boolean;
  createdAt: Date;
};

export type TransferOrganizerResponse = {
  event: CelebrationEventResponse;
  delegation: DelegationResponse;
};

export type CelebrationEventResponse = {
  id: string;
  teamId: string;
  personId: string;
  date: string;
  status: EventStatus;
  occasion: EventOccasion;
  budget: number | null;
  organizerId: string | null;
  organizerName: string | null;
  organizerEmail: string | null;
  deputyId: string | null;
  deputyName: string | null;
  deputyEmail: string | null;
  organizerIsBirthdayPerson: boolean;
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
  deputy: {
    id: string;
    name: string;
    email: string;
  } | null;
  contributionSummary: Omit<ContributionSummaryResponse, 'items'>;
  selectedGiftIdea: SelectedGiftIdeaResponse;
  giftIdeas: GiftIdeaResponse[];
};

type CelebrationEventWithRelations = CelebrationEvent & {
  person: Person;
  organizer?: User | null;
  deputy?: User | null;
  contributions?: Contribution[];
  selectedGiftIdea?: GiftIdeaWithProposer | null;
  giftIdeas?: GiftIdeaWithVotes[];
};

type ContributionWithUser = Contribution & {
  user: User;
};

type DelegationWithUsers = Delegation & {
  fromUser: User;
  toUser: User;
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

const DEPUTY_ASSIGNED_NOTIFICATION_TYPE = 'DEPUTY_ASSIGNED';
const ORGANIZER_TRANSFERRED_NOTIFICATION_TYPE = 'ORGANIZER_TRANSFERRED';

@Injectable()
export class EventsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly notificationsService: NotificationsService,
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
        occasion: createEventDto.occasion ?? EventOccasion.BIRTHDAY,
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

    if (updateEventDto.occasion !== undefined) {
      data.occasion = updateEventDto.occasion;
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

  async getContributions(
    teamId: string,
    userId: string,
    eventId: string,
  ): Promise<ContributionSummaryResponse> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    const event = await this.findTeamEventOrThrow(teamId, eventId);
    const contributions = await this.findEventContributions(eventId);

    return this.toContributionSummary(event.budget, contributions);
  }

  async createContribution(
    teamId: string,
    userId: string,
    eventId: string,
    createContributionDto: CreateContributionDto,
  ): Promise<ContributionSummaryResponse> {
    const event = await this.ensureCanManageEvent(teamId, userId, eventId);
    await this.ensureUserInTeam(teamId, createContributionDto.userId);

    const existingContribution =
      await this.prismaService.contribution.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId: createContributionDto.userId,
          },
        },
      });

    if (existingContribution) {
      throw new ConflictException(
        'Взнос этого участника уже добавлен в инициативу',
      );
    }

    await this.prismaService.contribution.create({
      data: {
        eventId,
        userId: createContributionDto.userId,
        amount: createContributionDto.amount,
        status: createContributionDto.status ?? ContributionStatus.PENDING,
        comment: this.trimOptionalText(createContributionDto.comment),
      },
    });

    const contributions = await this.findEventContributions(eventId);
    return this.toContributionSummary(event.budget, contributions);
  }

  async updateContribution(
    teamId: string,
    userId: string,
    eventId: string,
    contributionId: string,
    updateContributionDto: UpdateContributionDto,
  ): Promise<ContributionSummaryResponse> {
    const event = await this.ensureCanManageEvent(teamId, userId, eventId);
    await this.findEventContributionOrThrow(eventId, contributionId);

    const data: Prisma.ContributionUpdateInput = {};

    if (updateContributionDto.amount !== undefined) {
      data.amount = updateContributionDto.amount;
    }

    if (updateContributionDto.status !== undefined) {
      data.status = updateContributionDto.status;
    }

    if (updateContributionDto.comment !== undefined) {
      data.comment = this.trimOptionalText(updateContributionDto.comment);
    }

    await this.prismaService.contribution.update({
      where: { id: contributionId },
      data,
    });

    const contributions = await this.findEventContributions(eventId);
    return this.toContributionSummary(event.budget, contributions);
  }

  async updateContributionStatus(
    teamId: string,
    userId: string,
    eventId: string,
    contributionId: string,
    updateContributionStatusDto: UpdateContributionStatusDto,
  ): Promise<ContributionSummaryResponse> {
    const event = await this.ensureCanManageEvent(teamId, userId, eventId);
    await this.findEventContributionOrThrow(eventId, contributionId);

    await this.prismaService.contribution.update({
      where: { id: contributionId },
      data: {
        status: updateContributionStatusDto.status,
      },
    });

    const contributions = await this.findEventContributions(eventId);
    return this.toContributionSummary(event.budget, contributions);
  }

  async deleteContribution(
    teamId: string,
    userId: string,
    eventId: string,
    contributionId: string,
  ): Promise<ContributionSummaryResponse> {
    const event = await this.ensureCanManageEvent(teamId, userId, eventId);
    await this.findEventContributionOrThrow(eventId, contributionId);

    await this.prismaService.contribution.delete({
      where: { id: contributionId },
    });

    const contributions = await this.findEventContributions(eventId);
    return this.toContributionSummary(event.budget, contributions);
  }

  async assignDeputy(
    teamId: string,
    userId: string,
    eventId: string,
    assignDeputyDto: AssignDeputyDto,
  ): Promise<CelebrationEventResponse> {
    await this.ensureCanManageEvent(teamId, userId, eventId);

    if (assignDeputyDto.deputyId) {
      await this.ensureUserInTeam(teamId, assignDeputyDto.deputyId);
    }

    const event = await this.prismaService.celebrationEvent.update({
      where: { id: eventId },
      data: {
        deputyId: assignDeputyDto.deputyId ?? null,
      },
      include: this.eventInclude(),
    });

    if (assignDeputyDto.deputyId) {
      await this.notificationsService.createActionNotificationIfMissing({
        userId: assignDeputyDto.deputyId,
        eventId: event.id,
        type: DEPUTY_ASSIGNED_NOTIFICATION_TYPE,
        title: 'Вас назначили заместителем',
        message: `Вас назначили заместителем организатора по поздравлению ${event.person.fullName}.`,
      });
    }

    return this.toCelebrationEventResponse(event, userId);
  }

  async removeDeputy(
    teamId: string,
    userId: string,
    eventId: string,
  ): Promise<CelebrationEventResponse> {
    await this.ensureCanManageEvent(teamId, userId, eventId);

    const event = await this.prismaService.celebrationEvent.update({
      where: { id: eventId },
      data: {
        deputyId: null,
      },
      include: this.eventInclude(),
    });

    return this.toCelebrationEventResponse(event, userId);
  }

  async transferOrganizer(
    teamId: string,
    userId: string,
    eventId: string,
    createDelegationDto: CreateDelegationDto,
  ): Promise<TransferOrganizerResponse> {
    const membership = await this.teamsService.ensureTeamMember(teamId, userId);
    const event = await this.findTeamEventOrThrow(teamId, eventId);

    if (
      event.organizerId !== userId &&
      !this.isTeamManagementRole(membership.role)
    ) {
      throw new ForbiddenException(
        'Недостаточно прав для передачи прав организатора',
      );
    }

    if (!event.organizerId) {
      throw new BadRequestException('У инициативы не назначен организатор');
    }

    const previousOrganizerId = event.organizerId;
    await this.ensureUserInTeam(teamId, createDelegationDto.toUserId);

    const startDate = this.parseDateOnly(createDelegationDto.startDate);
    const endDate = createDelegationDto.endDate
      ? this.parseDateOnly(createDelegationDto.endDate)
      : null;

    if (endDate && endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException(
        'Дата окончания не может быть раньше даты начала',
      );
    }

    const result = await this.prismaService.$transaction(async (prisma) => {
      const delegation = await prisma.delegation.create({
        data: {
          teamId,
          eventId,
          fromUserId: previousOrganizerId,
          toUserId: createDelegationDto.toUserId,
          startDate,
          endDate,
          reason: this.trimOptionalText(createDelegationDto.reason),
          active: true,
        },
      });

      const updatedEvent = await prisma.celebrationEvent.update({
        where: { id: eventId },
        data: {
          organizerId: createDelegationDto.toUserId,
          deputyId:
            event.deputyId === createDelegationDto.toUserId
              ? null
              : event.deputyId,
        },
        include: this.eventInclude(),
      });

      return { delegationId: delegation.id, updatedEvent };
    });

    const delegation = await this.prismaService.delegation.findUniqueOrThrow({
      where: { id: result.delegationId },
      include: {
        fromUser: true,
        toUser: true,
      },
    });

    await this.notificationsService.createActionNotificationIfMissing({
      userId: createDelegationDto.toUserId,
      eventId: result.updatedEvent.id,
      type: ORGANIZER_TRANSFERRED_NOTIFICATION_TYPE,
      title: 'Вам передали права организатора',
      message: `Вам передали права организатора по поздравлению ${result.updatedEvent.person.fullName}.`,
    });

    return {
      event: this.toCelebrationEventResponse(result.updatedEvent, userId),
      delegation: this.toDelegationResponse(delegation),
    };
  }

  async getDelegations(
    teamId: string,
    userId: string,
    eventId: string,
  ): Promise<DelegationResponse[]> {
    await this.teamsService.ensureTeamMember(teamId, userId);
    await this.findTeamEventOrThrow(teamId, eventId);

    const delegations = await this.prismaService.delegation.findMany({
      where: {
        teamId,
        eventId,
      },
      include: {
        fromUser: true,
        toUser: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return delegations.map((delegation) =>
      this.toDelegationResponse(delegation),
    );
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

  private async findEventContributionOrThrow(
    eventId: string,
    contributionId: string,
  ): Promise<Contribution> {
    const contribution = await this.prismaService.contribution.findFirst({
      where: {
        id: contributionId,
        eventId,
      },
    });

    if (!contribution) {
      throw new NotFoundException('Взнос не найден');
    }

    return contribution;
  }

  private async findEventContributions(
    eventId: string,
  ): Promise<ContributionWithUser[]> {
    return this.prismaService.contribution.findMany({
      where: { eventId },
      include: { user: true },
      orderBy: [
        { status: 'asc' },
        {
          user: {
            name: 'asc',
          },
        },
        { createdAt: 'asc' },
      ],
    });
  }

  private async ensureUserInTeam(
    teamId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.prismaService.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new BadRequestException('Пользователь не состоит в коллективе');
    }
  }

  private async ensureCanManageEvent(
    teamId: string,
    userId: string,
    eventId: string,
  ): Promise<CelebrationEventWithRelations> {
    const membership = await this.teamsService.ensureTeamMember(teamId, userId);
    const event = await this.findTeamEventOrThrow(teamId, eventId);
    const hasTeamManagementRole = this.isTeamManagementRole(membership.role);

    if (
      !hasTeamManagementRole &&
      event.organizerId !== userId &&
      event.deputyId !== userId
    ) {
      throw new ForbiddenException(
        'Недостаточно прав для управления инициативой',
      );
    }

    return event;
  }

  private isTeamManagementRole(role: TeamRole): boolean {
    return role === TeamRole.OWNER || role === TeamRole.ADMIN;
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
      deputy: true,
      contributions: {
        orderBy: [{ createdAt: 'asc' }],
      },
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
      occasion: event.occasion,
      budget: event.budget === null ? null : Number(event.budget),
      organizerId: event.organizerId,
      organizerName: event.organizer?.name ?? null,
      organizerEmail: event.organizer?.email ?? null,
      deputyId: event.deputyId,
      deputyName: event.deputy?.name ?? null,
      deputyEmail: event.deputy?.email ?? null,
      organizerIsBirthdayPerson: this.isOrganizerBirthdayPerson(event),
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
      deputy: event.deputy
        ? {
            id: event.deputy.id,
            name: event.deputy.name,
            email: event.deputy.email,
          }
        : null,
      contributionSummary: this.toContributionSummary(
        event.budget,
        event.contributions ?? [],
      ),
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

  private toContributionSummary(
    budget: Prisma.Decimal | number | null,
    contributions: (Contribution | ContributionWithUser)[],
  ): ContributionSummaryResponse {
    const items = contributions.map((contribution) =>
      this.toContributionResponse(contribution),
    );
    const totalAmount = items.reduce((total, item) => total + item.amount, 0);
    const paidItems = items.filter(
      (item) => item.status === ContributionStatus.PAID,
    );
    const pendingItems = items.filter(
      (item) => item.status !== ContributionStatus.PAID,
    );
    const paidAmount = paidItems.reduce(
      (total, item) => total + item.amount,
      0,
    );
    const pendingAmount = pendingItems.reduce(
      (total, item) => total + item.amount,
      0,
    );
    const numericBudget =
      budget === null
        ? null
        : typeof budget === 'number'
          ? budget
          : Number(budget);
    const progressPercent =
      numericBudget && numericBudget > 0
        ? Math.min(100, Math.round((paidAmount / numericBudget) * 100))
        : paidAmount > 0
          ? 100
          : 0;

    return {
      budget: numericBudget,
      totalAmount,
      paidAmount,
      pendingAmount,
      paidCount: paidItems.length,
      pendingCount: pendingItems.length,
      progressPercent,
      items,
    };
  }

  private toContributionResponse(
    contribution: Contribution | ContributionWithUser,
  ): ContributionResponse {
    const user = 'user' in contribution ? contribution.user : null;

    return {
      id: contribution.id,
      userId: contribution.userId,
      userName: user?.name ?? '',
      userEmail: user?.email ?? '',
      amount: Number(contribution.amount),
      status: contribution.status,
      comment: contribution.comment,
      createdAt: contribution.createdAt,
      updatedAt: contribution.updatedAt,
    };
  }

  private toDelegationResponse(
    delegation: DelegationWithUsers,
  ): DelegationResponse {
    return {
      id: delegation.id,
      fromUserId: delegation.fromUserId,
      fromUserName: delegation.fromUser.name,
      fromUserEmail: delegation.fromUser.email,
      toUserId: delegation.toUserId,
      toUserName: delegation.toUser.name,
      toUserEmail: delegation.toUser.email,
      startDate: this.formatDateOnly(delegation.startDate),
      endDate: delegation.endDate
        ? this.formatDateOnly(delegation.endDate)
        : null,
      reason: delegation.reason,
      active: delegation.active,
      createdAt: delegation.createdAt,
    };
  }

  private isOrganizerBirthdayPerson(
    event: CelebrationEventWithRelations,
  ): boolean {
    const personEmail = event.person.email?.trim().toLowerCase();
    const organizerEmail = event.organizer?.email.trim().toLowerCase();

    return Boolean(
      personEmail && organizerEmail && personEmail === organizerEmail,
    );
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
