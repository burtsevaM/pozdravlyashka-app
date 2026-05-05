export type EventStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type EventPerson = {
  id: string;
  fullName: string;
  birthDate: string;
  department: string | null;
  status: string;
};

export type EventOrganizer = {
  id: string;
  name: string;
  email: string;
};

export type CelebrationEvent = {
  id: string;
  teamId: string;
  personId: string;
  date: string;
  status: EventStatus;
  budget: number | null;
  createdAt: string;
  person: EventPerson;
  organizer: EventOrganizer | null;
};

export type PersonCelebrationEvent = {
  id: string;
  teamId: string;
  personId: string;
  date: string;
  status: EventStatus;
  budget: number | null;
  createdAt: string;
  organizer: EventOrganizer | null;
};

export type CreateEventRequest = {
  personId: string;
  date: string;
  budget?: number;
};

export type UpdateEventRequest = {
  date?: string;
  budget?: number;
};

export type UpdateEventStatusRequest = {
  status: EventStatus;
};

export type EventFilters = {
  status?: EventStatus;
  personId?: string;
};
