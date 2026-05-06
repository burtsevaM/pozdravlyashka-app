import { ForbiddenException, Injectable } from '@nestjs/common';
import { Team, TeamMember, TeamRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

export type TeamWithUserRole = {
  id: string;
  name: string;
  createdById: string;
  createdAt: Date;
  role: TeamRole;
};

export type TeamMemberResponse = {
  userId: string;
  name: string;
  email: string;
  role: TeamRole;
};

type TeamMembership = TeamMember & {
  team: Team;
};

@Injectable()
export class TeamsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createTeam(
    userId: string,
    createTeamDto: CreateTeamDto,
  ): Promise<TeamWithUserRole> {
    const team = await this.prismaService.$transaction(async (prisma) => {
      const createdTeam = await prisma.team.create({
        data: {
          name: createTeamDto.name,
          createdById: userId,
        },
      });

      await prisma.teamMember.create({
        data: {
          teamId: createdTeam.id,
          userId,
          role: TeamRole.OWNER,
        },
      });

      return createdTeam;
    });

    return this.toTeamWithUserRole(team, TeamRole.OWNER);
  }

  async getMyTeams(userId: string): Promise<TeamWithUserRole[]> {
    const memberships = await this.prismaService.teamMember.findMany({
      where: { userId },
      include: { team: true },
      orderBy: {
        team: {
          createdAt: 'asc',
        },
      },
    });

    return memberships.map((membership) =>
      this.toTeamWithUserRole(membership.team, membership.role),
    );
  }

  async getTeam(teamId: string, userId: string): Promise<TeamWithUserRole> {
    const membership = await this.ensureTeamMember(teamId, userId);
    return this.toTeamWithUserRole(membership.team, membership.role);
  }

  async getTeamMembers(
    teamId: string,
    userId: string,
  ): Promise<TeamMemberResponse[]> {
    await this.ensureTeamMember(teamId, userId);

    const members = await this.prismaService.teamMember.findMany({
      where: { teamId },
      include: { user: true },
      orderBy: [
        {
          user: {
            name: 'asc',
          },
        },
        {
          user: {
            email: 'asc',
          },
        },
      ],
    });

    return members.map((member) => ({
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
    }));
  }

  async ensureTeamMember(
    teamId: string,
    userId: string,
  ): Promise<TeamMembership> {
    const membership = await this.prismaService.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      include: { team: true },
    });

    if (!membership) {
      throw new ForbiddenException('Нет доступа к этому коллективу');
    }

    return membership;
  }

  private toTeamWithUserRole(team: Team, role: TeamRole): TeamWithUserRole {
    return {
      id: team.id,
      name: team.name,
      createdById: team.createdById,
      createdAt: team.createdAt,
      role,
    };
  }
}
