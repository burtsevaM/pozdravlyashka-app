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
import { AuthUser } from '../auth/types/auth-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import {
  PeopleService,
  PersonResponse,
  UpcomingBirthdayResponse,
} from './people.service';

type AuthenticatedRequest = Request & {
  user: AuthUser;
};

@Controller('teams/:teamId/people')
@UseGuards(JwtAuthGuard)
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Post()
  createPerson(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() createPersonDto: CreatePersonDto,
  ): Promise<PersonResponse> {
    return this.peopleService.createPerson(
      teamId,
      request.user.id,
      createPersonDto,
    );
  }

  @Get()
  getPeople(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<PersonResponse[]> {
    return this.peopleService.getPeople(
      teamId,
      request.user.id,
      includeArchived === 'true',
    );
  }

  @Get('upcoming-birthdays')
  getUpcomingBirthdays(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Query('days') days?: string,
  ): Promise<UpcomingBirthdayResponse[]> {
    return this.peopleService.getUpcomingBirthdays(
      teamId,
      request.user.id,
      days,
    );
  }

  @Get(':personId')
  getPerson(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
  ): Promise<PersonResponse> {
    return this.peopleService.getPerson(teamId, request.user.id, personId);
  }

  @Patch(':personId')
  updatePerson(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @Body() updatePersonDto: UpdatePersonDto,
  ): Promise<PersonResponse> {
    return this.peopleService.updatePerson(
      teamId,
      request.user.id,
      personId,
      updatePersonDto,
    );
  }

  @Patch(':personId/archive')
  archivePerson(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
  ): Promise<PersonResponse> {
    return this.peopleService.archivePerson(teamId, request.user.id, personId);
  }
}
