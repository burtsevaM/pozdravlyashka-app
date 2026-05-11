import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user.type';
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
import {
  CelebrationEventResponse,
  ContributionSummaryResponse,
  DelegationResponse,
  EventsService,
  GiftIdeaResponse,
  TransferOrganizerResponse,
} from './events.service';

type AuthenticatedRequest = Request & {
  user: AuthUser;
};

@Controller('teams/:teamId/events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  getEvents(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Query() query: GetEventsQueryDto,
  ): Promise<CelebrationEventResponse[]> {
    return this.eventsService.getEvents(teamId, request.user.id, query);
  }

  @Post()
  createEvent(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() createEventDto: CreateEventDto,
  ): Promise<CelebrationEventResponse> {
    return this.eventsService.createEvent(
      teamId,
      request.user.id,
      createEventDto,
    );
  }

  @Get(':eventId')
  getEvent(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<CelebrationEventResponse> {
    return this.eventsService.getEvent(teamId, request.user.id, eventId);
  }

  @Patch(':eventId')
  updateEvent(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() updateEventDto: UpdateEventDto,
  ): Promise<CelebrationEventResponse> {
    return this.eventsService.updateEvent(
      teamId,
      request.user.id,
      eventId,
      updateEventDto,
    );
  }

  @Delete(':eventId')
  @HttpCode(204)
  deleteEvent(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<void> {
    return this.eventsService.deleteEvent(teamId, request.user.id, eventId);
  }

  @Patch(':eventId/status')
  updateEventStatus(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() updateEventStatusDto: UpdateEventStatusDto,
  ): Promise<CelebrationEventResponse> {
    return this.eventsService.updateEventStatus(
      teamId,
      request.user.id,
      eventId,
      updateEventStatusDto,
    );
  }

  @Get(':eventId/gift-ideas')
  getGiftIdeas(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<GiftIdeaResponse[]> {
    return this.eventsService.getGiftIdeas(teamId, request.user.id, eventId);
  }

  @Post(':eventId/gift-ideas')
  createGiftIdea(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() createGiftIdeaDto: CreateGiftIdeaDto,
  ): Promise<GiftIdeaResponse[]> {
    return this.eventsService.createGiftIdea(
      teamId,
      request.user.id,
      eventId,
      createGiftIdeaDto,
    );
  }

  @Patch(':eventId/gift-ideas/:ideaId')
  updateGiftIdea(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('ideaId', ParseUUIDPipe) ideaId: string,
    @Body() updateGiftIdeaDto: UpdateGiftIdeaDto,
  ): Promise<GiftIdeaResponse[]> {
    return this.eventsService.updateGiftIdea(
      teamId,
      request.user.id,
      eventId,
      ideaId,
      updateGiftIdeaDto,
    );
  }

  @Delete(':eventId/gift-ideas/:ideaId')
  deleteGiftIdea(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('ideaId', ParseUUIDPipe) ideaId: string,
  ): Promise<GiftIdeaResponse[]> {
    return this.eventsService.deleteGiftIdea(
      teamId,
      request.user.id,
      eventId,
      ideaId,
    );
  }

  @Post(':eventId/gift-ideas/:ideaId/vote')
  voteForGiftIdea(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('ideaId', ParseUUIDPipe) ideaId: string,
  ): Promise<GiftIdeaResponse[]> {
    return this.eventsService.voteForGiftIdea(
      teamId,
      request.user.id,
      eventId,
      ideaId,
    );
  }

  @Delete(':eventId/vote')
  @HttpCode(200)
  removeVote(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<GiftIdeaResponse[]> {
    return this.eventsService.removeVote(teamId, request.user.id, eventId);
  }

  @Patch(':eventId/selected-gift')
  selectGiftIdea(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() selectGiftIdeaDto: SelectGiftIdeaDto,
  ): Promise<CelebrationEventResponse> {
    return this.eventsService.selectGiftIdea(
      teamId,
      request.user.id,
      eventId,
      selectGiftIdeaDto,
    );
  }

  @Delete(':eventId/selected-gift')
  @HttpCode(200)
  clearSelectedGiftIdea(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<CelebrationEventResponse> {
    return this.eventsService.clearSelectedGiftIdea(
      teamId,
      request.user.id,
      eventId,
    );
  }

  @Get(':eventId/contributions')
  getContributions(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<ContributionSummaryResponse> {
    return this.eventsService.getContributions(
      teamId,
      request.user.id,
      eventId,
    );
  }

  @Post(':eventId/contributions')
  createContribution(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() createContributionDto: CreateContributionDto,
  ): Promise<ContributionSummaryResponse> {
    return this.eventsService.createContribution(
      teamId,
      request.user.id,
      eventId,
      createContributionDto,
    );
  }

  @Patch(':eventId/contributions/:contributionId')
  updateContribution(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('contributionId', ParseUUIDPipe) contributionId: string,
    @Body() updateContributionDto: UpdateContributionDto,
  ): Promise<ContributionSummaryResponse> {
    return this.eventsService.updateContribution(
      teamId,
      request.user.id,
      eventId,
      contributionId,
      updateContributionDto,
    );
  }

  @Patch(':eventId/contributions/:contributionId/status')
  updateContributionStatus(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('contributionId', ParseUUIDPipe) contributionId: string,
    @Body() updateContributionStatusDto: UpdateContributionStatusDto,
  ): Promise<ContributionSummaryResponse> {
    return this.eventsService.updateContributionStatus(
      teamId,
      request.user.id,
      eventId,
      contributionId,
      updateContributionStatusDto,
    );
  }

  @Delete(':eventId/contributions/:contributionId')
  deleteContribution(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('contributionId', ParseUUIDPipe) contributionId: string,
  ): Promise<ContributionSummaryResponse> {
    return this.eventsService.deleteContribution(
      teamId,
      request.user.id,
      eventId,
      contributionId,
    );
  }

  @Patch(':eventId/deputy')
  assignDeputy(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() assignDeputyDto: AssignDeputyDto,
  ): Promise<CelebrationEventResponse> {
    return this.eventsService.assignDeputy(
      teamId,
      request.user.id,
      eventId,
      assignDeputyDto,
    );
  }

  @Delete(':eventId/deputy')
  @HttpCode(200)
  removeDeputy(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<CelebrationEventResponse> {
    return this.eventsService.removeDeputy(teamId, request.user.id, eventId);
  }

  @Post(':eventId/delegations')
  transferOrganizer(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() createDelegationDto: CreateDelegationDto,
  ): Promise<TransferOrganizerResponse> {
    return this.eventsService.transferOrganizer(
      teamId,
      request.user.id,
      eventId,
      createDelegationDto,
    );
  }

  @Get(':eventId/delegations')
  getDelegations(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<DelegationResponse[]> {
    return this.eventsService.getDelegations(teamId, request.user.id, eventId);
  }
}
