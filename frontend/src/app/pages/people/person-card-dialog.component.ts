import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import {
  CelebrationEvent,
  EventStatus,
  PersonCelebrationEvent,
} from '../../core/models/event.models';
import { GiftHistory } from '../../core/models/gift-history.models';
import { Person, PersonStatus } from '../../core/models/person.models';
import { PeopleService } from '../../core/services/people.service';

export type PersonCardDialogData = {
  teamId: string;
  personId: string;
  currentEvent?: CelebrationEvent;
};

type EventStatusOption = {
  value: EventStatus;
  label: string;
};

type PersonStatusOption = {
  value: PersonStatus;
  label: string;
};

@Component({
  selector: 'app-person-card-dialog',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './person-card-dialog.component.html',
  styleUrl: './person-card-dialog.component.scss',
})
export class PersonCardDialogComponent implements OnInit {
  private readonly data = inject<PersonCardDialogData>(MAT_DIALOG_DATA);
  private readonly destroyRef = inject(DestroyRef);
  private readonly peopleService = inject(PeopleService);

  protected readonly person = signal<Person | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly currentEvent = this.data.currentEvent ?? null;

  private readonly eventStatusOptions: EventStatusOption[] = [
    { value: 'PLANNED', label: 'Запланирована' },
    { value: 'IN_PROGRESS', label: 'Выбор подарка' },
    { value: 'COMPLETED', label: 'Завершена' },
    { value: 'CANCELLED', label: 'Отменена' },
  ];

  private readonly personStatusOptions: PersonStatusOption[] = [
    { value: 'ACTIVE', label: 'Активный' },
    { value: 'INACTIVE', label: 'Неактивный' },
    { value: 'ARCHIVED', label: 'В архиве' },
  ];

  ngOnInit(): void {
    this.loadPerson();
  }

  protected get giftHistory(): GiftHistory[] {
    return this.person()?.giftHistory ?? [];
  }

  protected get celebrationEvents(): PersonCelebrationEvent[] {
    return this.person()?.celebrationEvents ?? [];
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

  protected getEventStatusLabel(status: EventStatus): string {
    return this.eventStatusOptions.find((option) => option.value === status)?.label ?? status;
  }

  protected getPersonStatusLabel(status: PersonStatus): string {
    return this.personStatusOptions.find((option) => option.value === status)?.label ?? status;
  }

  protected getCurrentEventTitle(event: CelebrationEvent): string {
    if (event.selectedGiftIdea) {
      return `Итоговый подарок: ${event.selectedGiftIdea.title}`;
    }

    const leadingGiftIdea = event.giftIdeas.reduce<CelebrationEvent['giftIdeas'][number] | null>(
      (leader, idea) => (!leader || idea.voteCount > leader.voteCount ? idea : leader),
      null,
    );

    if (leadingGiftIdea && leadingGiftIdea.voteCount > 0) {
      return `Лидирует: ${leadingGiftIdea.title} - ${leadingGiftIdea.voteCount} ${this.getVotesWord(
        leadingGiftIdea.voteCount,
      )}`;
    }

    if (event.giftIdeas.length > 0) {
      return 'Активный выбор подарка';
    }

    return 'Идей подарков пока нет';
  }

  protected getTotalVotesCount(event: CelebrationEvent): number {
    return event.giftIdeas.reduce((total, idea) => total + idea.voteCount, 0);
  }

  private loadPerson(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.peopleService
      .getPersonDetails(this.data.teamId, this.data.personId)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (person) => this.person.set(person),
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'загрузить карточку участника'));
        },
      });
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

  private getActionErrorMessage(error: unknown, action: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return `Не удалось ${action}: frontend не смог отправить запрос.`;
    }

    if (error.status === 0) {
      return `Не удалось ${action}: backend недоступен или нет сети.`;
    }

    if (error.status === 401) {
      return `Не удалось ${action}: войдите в аккаунт заново.`;
    }

    if (error.status === 404) {
      return `Не удалось ${action}: данные не найдены.`;
    }

    return `Не удалось ${action}: запрос завершился ошибкой.`;
  }
}
