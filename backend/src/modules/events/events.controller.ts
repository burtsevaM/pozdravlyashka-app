import {
  Body,
  Controller,
  Get,
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
import { GetEventsQueryDto } from './dto/get-events-query.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CelebrationEventResponse, EventsService } from './events.service';

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
}
