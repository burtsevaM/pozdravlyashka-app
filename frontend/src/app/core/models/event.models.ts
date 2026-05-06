import { GiftIdea, SelectedGiftIdea } from './gift-idea.models';
import { ContributionSummary } from './contribution.models';

export type EventStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type EventOccasion =
  | 'BIRTHDAY'
  | 'CORPORATE'
  | 'PROFESSIONAL_HOLIDAY'
  | 'ANNIVERSARY'
  | 'FAREWELL'
  | 'SUPPORT'
  | 'OTHER';

export const DEFAULT_EVENT_OCCASION: EventOccasion = 'BIRTHDAY';

export const EVENT_OCCASION_LABELS: Record<EventOccasion, string> = {
  BIRTHDAY: 'День рождения',
  CORPORATE: 'Корпоратив',
  PROFESSIONAL_HOLIDAY: 'Профессиональный праздник',
  ANNIVERSARY: 'Юбилей',
  FAREWELL: 'Проводы',
  SUPPORT: 'Поддержка',
  OTHER: 'Другое',
};

export const EVENT_OCCASION_OPTIONS: { value: EventOccasion; label: string }[] = [
  { value: 'BIRTHDAY', label: EVENT_OCCASION_LABELS.BIRTHDAY },
  { value: 'CORPORATE', label: EVENT_OCCASION_LABELS.CORPORATE },
  { value: 'PROFESSIONAL_HOLIDAY', label: EVENT_OCCASION_LABELS.PROFESSIONAL_HOLIDAY },
  { value: 'ANNIVERSARY', label: EVENT_OCCASION_LABELS.ANNIVERSARY },
  { value: 'FAREWELL', label: EVENT_OCCASION_LABELS.FAREWELL },
  { value: 'SUPPORT', label: EVENT_OCCASION_LABELS.SUPPORT },
  { value: 'OTHER', label: EVENT_OCCASION_LABELS.OTHER },
];

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
  occasion: EventOccasion;
  budget: number | null;
  organizerId: string | null;
  organizerName: string | null;
  organizerEmail: string | null;
  deputyId: string | null;
  deputyName: string | null;
  deputyEmail: string | null;
  organizerIsBirthdayPerson: boolean;
  selectedGiftIdeaId: string | null;
  selectedGiftIdea: SelectedGiftIdea | null;
  giftIdeas: GiftIdea[];
  contributionSummary: Omit<ContributionSummary, 'items'>;
  createdAt: string;
  person: EventPerson;
  organizer: EventOrganizer | null;
  deputy: EventOrganizer | null;
};

export type PersonCelebrationEvent = {
  id: string;
  teamId: string;
  personId: string;
  date: string;
  status: EventStatus;
  occasion: EventOccasion;
  budget: number | null;
  organizerId?: string | null;
  organizerName?: string | null;
  organizerEmail?: string | null;
  deputyId?: string | null;
  deputyName?: string | null;
  deputyEmail?: string | null;
  organizerIsBirthdayPerson?: boolean;
  selectedGiftIdeaId: string | null;
  selectedGiftIdea: SelectedGiftIdea | null;
  createdAt: string;
  organizer: EventOrganizer | null;
  deputy?: EventOrganizer | null;
};

export type CreateEventRequest = {
  personId: string;
  date: string;
  occasion?: EventOccasion;
  budget?: number;
};

export type UpdateEventRequest = {
  date?: string;
  occasion?: EventOccasion;
  budget?: number;
};

export type UpdateEventStatusRequest = {
  status: EventStatus;
};

export type EventFilters = {
  status?: EventStatus;
  personId?: string;
};
