import { PersonCelebrationEvent } from './event.models';
import { GiftHistory } from './gift-history.models';

export type PersonStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type Person = {
  id: string;
  teamId: string;
  fullName: string;
  email: string | null;
  birthDate: string;
  department: string | null;
  status: PersonStatus;
  preferences: string | null;
  notes: string | null;
  createdAt: string;
  giftHistory?: GiftHistory[];
  celebrationEvents?: PersonCelebrationEvent[];
};

export type CreatePersonRequest = {
  fullName: string;
  email?: string;
  birthDate: string;
  department?: string;
  preferences?: string;
  notes?: string;
};

export type UpdatePersonRequest = Partial<CreatePersonRequest>;

export type UpcomingBirthday = {
  id: string;
  fullName: string;
  email: string | null;
  birthDate: string;
  department: string | null;
  nextBirthday: string;
  daysUntil: number;
};
