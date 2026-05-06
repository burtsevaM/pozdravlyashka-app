export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export type Team = {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
};

export type TeamWithRole = Team & {
  role: TeamRole;
};

export type TeamMember = {
  userId: string;
  name: string;
  email: string;
  role: TeamRole;
};

export type CreateTeamRequest = {
  name: string;
};

export type UpdateTeamRequest = {
  name: string;
};
