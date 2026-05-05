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
import { AuthUser } from '../auth/types/auth-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateGiftHistoryDto } from './dto/create-gift-history.dto';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdateGiftHistoryDto } from './dto/update-gift-history.dto';
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

  @Get(':personId/gift-history')
  getGiftHistory(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
  ) {
    return this.peopleService.getGiftHistory(teamId, request.user.id, personId);
  }

  @Post(':personId/gift-history')
  createGiftHistory(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @Body() createGiftHistoryDto: CreateGiftHistoryDto,
  ) {
    return this.peopleService.createGiftHistory(
      teamId,
      request.user.id,
      personId,
      createGiftHistoryDto,
    );
  }

  @Patch(':personId/gift-history/:giftHistoryId')
  updateGiftHistory(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @Param('giftHistoryId', ParseUUIDPipe) giftHistoryId: string,
    @Body() updateGiftHistoryDto: UpdateGiftHistoryDto,
  ) {
    return this.peopleService.updateGiftHistory(
      teamId,
      request.user.id,
      personId,
      giftHistoryId,
      updateGiftHistoryDto,
    );
  }

  @Delete(':personId/gift-history/:giftHistoryId')
  @HttpCode(204)
  deleteGiftHistory(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @Param('giftHistoryId', ParseUUIDPipe) giftHistoryId: string,
  ): Promise<void> {
    return this.peopleService.deleteGiftHistory(
      teamId,
      request.user.id,
      personId,
      giftHistoryId,
    );
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
