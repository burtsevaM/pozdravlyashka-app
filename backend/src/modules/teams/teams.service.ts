import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Team, TeamMember, TeamRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

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

  async addTeamMember(
    teamId: string,
    userId: string,
    addTeamMemberDto: AddTeamMemberDto,
  ): Promise<TeamMemberResponse> {
    const membership = await this.ensureTeamMember(teamId, userId);

    if (
      membership.role !== TeamRole.OWNER &&
      membership.role !== TeamRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Добавлять пользователей может только владелец или администратор коллектива',
      );
    }

    const role = addTeamMemberDto.role ?? TeamRole.MEMBER;

    if (role === TeamRole.OWNER) {
      throw new BadRequestException(
        'Добавить пользователя с ролью владельца нельзя',
      );
    }

    const user = await this.prismaService.user.findUnique({
      where: { email: addTeamMemberDto.email },
    });

    if (!user) {
      throw new NotFoundException(
        'Пользователь с таким email не найден. Сначала он должен зарегистрироваться.',
      );
    }

    const existingMembership = await this.prismaService.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id,
        },
      },
      include: { user: true },
    });

    if (existingMembership) {
      throw new ConflictException('Пользователь уже состоит в коллективе.');
    }

    try {
      const member = await this.prismaService.teamMember.create({
        data: {
          teamId,
          userId: user.id,
          role,
        },
        include: { user: true },
      });

      return this.toTeamMemberResponse(member);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Пользователь уже состоит в коллективе.');
      }

      throw error;
    }
  }

  async updateTeam(
    teamId: string,
    userId: string,
    updateTeamDto: UpdateTeamDto,
  ): Promise<TeamWithUserRole> {
    const membership = await this.ensureTeamMember(teamId, userId);

    if (
      membership.role !== TeamRole.OWNER &&
      membership.role !== TeamRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Редактировать коллектив может только владелец или администратор',
      );
    }

    const team = await this.prismaService.team.update({
      where: { id: teamId },
      data: {
        name: updateTeamDto.name,
      },
    });

    return this.toTeamWithUserRole(team, membership.role);
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

  private toTeamMemberResponse(
    member: TeamMember & { user: { name: string; email: string } },
  ): TeamMemberResponse {
    return {
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
