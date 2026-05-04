import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamsService, TeamWithUserRole } from './teams.service';

type AuthenticatedRequest = Request & {
  user: AuthUser;
};

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  createTeam(
    @Req() request: AuthenticatedRequest,
    @Body() createTeamDto: CreateTeamDto,
  ): Promise<TeamWithUserRole> {
    return this.teamsService.createTeam(request.user.id, createTeamDto);
  }

  @Get()
  getMyTeams(
    @Req() request: AuthenticatedRequest,
  ): Promise<TeamWithUserRole[]> {
    return this.teamsService.getMyTeams(request.user.id);
  }

  @Get(':teamId')
  getTeam(
    @Req() request: AuthenticatedRequest,
    @Param('teamId', ParseUUIDPipe) teamId: string,
  ): Promise<TeamWithUserRole> {
    return this.teamsService.getTeam(teamId, request.user.id);
  }
}
