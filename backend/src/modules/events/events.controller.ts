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
import { CreateEventDto } from './dto/create-event.dto';
import { CreateGiftIdeaDto } from './dto/create-gift-idea.dto';
import { GetEventsQueryDto } from './dto/get-events-query.dto';
import { SelectGiftIdeaDto } from './dto/select-gift-idea.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateGiftIdeaDto } from './dto/update-gift-idea.dto';
import {
  CelebrationEventResponse,
  EventsService,
  GiftIdeaResponse,
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
}
