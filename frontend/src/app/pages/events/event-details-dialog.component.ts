import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import {
  CelebrationEvent,
  EVENT_OCCASION_LABELS,
  EventOccasion,
  EventStatus,
} from '../../core/models/event.models';
import { GiftIdea } from '../../core/models/gift-idea.models';
import { GiftHistory } from '../../core/models/gift-history.models';
import { Person } from '../../core/models/person.models';

export type EventDetailsDialogData = {
  event: CelebrationEvent;
  person: Person;
};

type EventStatusOption = {
  value: EventStatus;
  label: string;
};

@Component({
  selector: 'app-event-details-dialog',
  imports: [MatButtonModule, MatCardModule, MatChipsModule, MatDialogModule, MatIconModule],
  templateUrl: './event-details-dialog.component.html',
  styleUrl: './event-details-dialog.component.scss',
})
export class EventDetailsDialogComponent {
  protected readonly data = inject<EventDetailsDialogData>(MAT_DIALOG_DATA);

  private readonly statusOptions: EventStatusOption[] = [
    { value: 'PLANNED', label: 'Запланирована' },
    { value: 'IN_PROGRESS', label: 'Выбор подарка' },
    { value: 'COMPLETED', label: 'Завершена' },
    { value: 'CANCELLED', label: 'Отменена' },
  ];

  protected get leadingGiftIdea(): GiftIdea | null {
    return this.getLeadingGiftIdea(this.data.event.giftIdeas);
  }

  protected get giftHistory(): GiftHistory[] {
    return this.data.person.giftHistory ?? [];
  }

  protected get celebrationEvents(): NonNullable<Person['celebrationEvents']> {
    return this.data.person.celebrationEvents ?? [];
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
  }

  protected formatMoney(value: number | null): string {
    return value === null
      ? 'Не указан'
      : new Intl.NumberFormat('ru-RU', {
          style: 'currency',
          currency: 'RUB',
          maximumFractionDigits: 0,
        }).format(value);
  }

  protected formatGiftYear(year: number | null): string {
    return year === null ? 'Год не указан' : String(year);
  }

  protected getStatusLabel(status: EventStatus): string {
    return this.statusOptions.find((option) => option.value === status)?.label ?? status;
  }

  protected getOccasionLabel(occasion: EventOccasion): string {
    return EVENT_OCCASION_LABELS[occasion];
  }

  protected getTotalVotesCount(event: CelebrationEvent): number {
    return event.giftIdeas.reduce((total, idea) => total + idea.voteCount, 0);
  }

  protected getEventTitle(event: CelebrationEvent): string {
    const selectedGiftIdea = event.selectedGiftIdea;

    if (selectedGiftIdea) {
      return `Итоговый подарок: ${selectedGiftIdea.title}`;
    }

    const leader = this.getLeadingGiftIdea(event.giftIdeas);

    if (leader && leader.voteCount > 0) {
      return `Лидирует: ${leader.title} - ${leader.voteCount} ${this.getVotesWord(leader.voteCount)}`;
    }

    if (event.giftIdeas.length > 0) {
      return 'Активный выбор подарка';
    }

    return 'Идей подарков пока нет';
  }

  protected getGiftHistoryTrackBy(_: number, giftHistory: GiftHistory): string {
    return giftHistory.id;
  }

  private getLeadingGiftIdea(giftIdeas: GiftIdea[]): GiftIdea | null {
    return giftIdeas.reduce<GiftIdea | null>((leader, idea) => {
      if (!leader || idea.voteCount > leader.voteCount) {
        return idea;
      }

      return leader;
    }, null);
  }

  private getVotesWord(count: number): string {
    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return 'голосов';
    }

    if (lastDigit === 1) {
      return 'голос';
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
      return 'голоса';
    }

    return 'голосов';
  }
}
