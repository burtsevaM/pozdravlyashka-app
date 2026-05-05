import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { finalize, forkJoin } from 'rxjs';
import {
  CelebrationEvent,
  CreateEventRequest,
  EventStatus,
  UpdateEventRequest,
} from '../../core/models/event.models';
import { GiftIdea } from '../../core/models/gift-idea.models';
import { Person } from '../../core/models/person.models';
import { EventsService } from '../../core/services/events.service';
import { PeopleService } from '../../core/services/people.service';
import { TeamContextService } from '../../core/services/team-context.service';
import {
  EventDetailsDialogComponent,
  EventDetailsDialogData,
} from './event-details-dialog.component';
import { EventDialogComponent, EventDialogData, EventDialogResult } from './event-dialog.component';
import {
  GiftIdeasDialogComponent,
  GiftIdeasDialogData,
  GiftIdeasDialogResult,
} from './gift-ideas-dialog.component';

type EventStatusOption = {
  value: EventStatus;
  label: string;
};

@Component({
  selector: 'app-events-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './events-page.html',
  styleUrl: './events-page.scss',
})
export class EventsPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly eventsService = inject(EventsService);
  private readonly peopleService = inject(PeopleService);
  protected readonly teamContext = inject(TeamContextService);

  protected readonly events = signal<CelebrationEvent[]>([]);
  protected readonly people = signal<Person[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly statusOptions: EventStatusOption[] = [
    { value: 'PLANNED', label: 'Запланирована' },
    { value: 'IN_PROGRESS', label: 'Выбор подарка' },
    { value: 'COMPLETED', label: 'Завершена' },
    { value: 'CANCELLED', label: 'Отменена' },
  ];

  ngOnInit(): void {
    this.teamContext
      .loadTeams()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadPageData(),
        error: () => this.errorMessage.set('Не удалось загрузить коллективы'),
      });
  }

  protected loadPageData(): void {
    const activeTeamId = this.teamContext.activeTeamId();

    if (!activeTeamId) {
      this.events.set([]);
      this.people.set([]);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      events: this.eventsService.getEvents(activeTeamId),
      people: this.peopleService.getPeople(activeTeamId),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ events, people }) => {
          this.events.set(events);
          this.people.set(people);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'загрузить инициативы'));
        },
      });
  }

  protected openCreateDialog(): void {
    if (this.people().length === 0) {
      this.errorMessage.set('Сначала добавьте участника коллектива');
      return;
    }

    const dialogRef = this.dialog.open<EventDialogComponent, EventDialogData, EventDialogResult>(
      EventDialogComponent,
      {
        width: 'min(600px, calc(100vw - 32px))',
        data: {
          people: this.people(),
        },
      },
    );

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result || !this.isCreateEventRequest(result)) {
          return;
        }

        this.createEvent(result);
      });
  }

  protected openEditDialog(event: CelebrationEvent): void {
    const dialogRef = this.dialog.open<EventDialogComponent, EventDialogData, EventDialogResult>(
      EventDialogComponent,
      {
        width: 'min(600px, calc(100vw - 32px))',
        data: {
          people: this.people(),
          event,
        },
      },
    );

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result || this.isCreateEventRequest(result)) {
          return;
        }

        this.updateEvent(event.id, result);
      });
  }

  protected openEvent(event: CelebrationEvent): void {
    const activeTeamId = this.teamContext.activeTeamId();

    if (!activeTeamId) {
      return;
    }

    this.errorMessage.set(null);

    forkJoin({
      event: this.eventsService.getEvent(activeTeamId, event.id),
      person: this.peopleService.getPersonDetails(activeTeamId, event.personId),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ event: loadedEvent, person }) => {
          this.replaceEvent(loadedEvent);
          this.dialog.open<EventDetailsDialogComponent, EventDetailsDialogData>(
            EventDetailsDialogComponent,
            {
              width: 'min(960px, calc(100vw - 24px))',
              maxWidth: '100vw',
              data: {
                event: loadedEvent,
                person,
              },
            },
          );
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'открыть инициативу'));
        },
      });
  }

  protected openGiftIdeas(event: CelebrationEvent): void {
    const activeTeamId = this.teamContext.activeTeamId();

    if (!activeTeamId) {
      return;
    }

    this.errorMessage.set(null);

    this.eventsService
      .getEvent(activeTeamId, event.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (loadedEvent) => {
          this.replaceEvent(loadedEvent);
          const dialogRef = this.dialog.open<
            GiftIdeasDialogComponent,
            GiftIdeasDialogData,
            GiftIdeasDialogResult
          >(GiftIdeasDialogComponent, {
            width: 'min(980px, calc(100vw - 24px))',
            maxWidth: '100vw',
            disableClose: true,
            data: {
              teamId: activeTeamId,
              event: loadedEvent,
            },
          });

          dialogRef
            .afterClosed()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((updatedEvent) => {
              if (!updatedEvent) {
                return;
              }

              this.replaceEvent(updatedEvent);
              this.successMessage.set('Сводка по подаркам обновлена');
            });
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'открыть идеи подарков'));
        },
      });
  }

  protected updateEventStatus(event: CelebrationEvent, status: EventStatus): void {
    const activeTeamId = this.teamContext.activeTeamId();

    if (!activeTeamId || event.status === status) {
      return;
    }

    this.eventsService
      .updateEventStatus(activeTeamId, event.id, { status })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedEvent) => {
          this.successMessage.set('Статус инициативы обновлен');
          this.replaceEvent(updatedEvent);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'изменить статус инициативы'));
        },
      });
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

  protected getStatusLabel(status: EventStatus): string {
    return this.statusOptions.find((option) => option.value === status)?.label ?? status;
  }

  protected getDaysUntilLabel(value: string): string {
    const today = this.toDateOnly(new Date());
    const eventDate = new Date(`${value}T00:00:00`);
    const diff = Math.round((eventDate.getTime() - today.getTime()) / 86_400_000);

    if (diff === 0) {
      return 'сегодня';
    }

    if (diff < 0) {
      return 'дата прошла';
    }

    return `через ${diff} ${this.getDaysWord(diff)}`;
  }

  protected getTotalVotesCount(event: CelebrationEvent): number {
    return event.giftIdeas.reduce((total, idea) => total + idea.voteCount, 0);
  }

  protected getLeadingGiftIdea(event: CelebrationEvent): GiftIdea | null {
    return event.giftIdeas.reduce<GiftIdea | null>((leader, idea) => {
      if (!leader || idea.voteCount > leader.voteCount) {
        return idea;
      }

      return leader;
    }, null);
  }

  protected getGiftSummaryTitle(event: CelebrationEvent): string {
    if (event.selectedGiftIdea) {
      return `Итоговый подарок: ${event.selectedGiftIdea.title}`;
    }

    if (event.giftIdeas.length === 0) {
      return 'Идей подарков пока нет';
    }

    return 'Активный выбор подарка';
  }

  protected getGiftSummaryDescription(event: CelebrationEvent): string {
    if (event.selectedGiftIdea) {
      return 'Подарок выбран и сохранен в инициативе.';
    }

    const leadingGiftIdea = this.getLeadingGiftIdea(event);

    if (leadingGiftIdea && leadingGiftIdea.voteCount > 0) {
      return `Лидирует: ${leadingGiftIdea.title} - ${leadingGiftIdea.voteCount} ${this.getVotesWord(
        leadingGiftIdea.voteCount,
      )}`;
    }

    if (event.giftIdeas.length > 0) {
      return 'Пока нет голосов.';
    }

    return 'Добавьте первый вариант для голосования.';
  }

  protected getGiftSummaryMeta(event: CelebrationEvent): string {
    const ideasCount = event.giftIdeas.length;
    const votesCount = this.getTotalVotesCount(event);

    return `${ideasCount} ${this.getIdeasWord(ideasCount)}, ${votesCount} ${this.getVotesWord(
      votesCount,
    )}`;
  }

  private createEvent(data: CreateEventRequest): void {
    const activeTeamId = this.teamContext.activeTeamId();

    if (!activeTeamId) {
      return;
    }

    this.eventsService
      .createEvent(activeTeamId, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          this.successMessage.set('Инициатива поздравления создана');
          this.events.update((events) => [...events, event].sort(this.sortEvents));
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'создать инициативу'));
        },
      });
  }

  private updateEvent(eventId: string, data: UpdateEventRequest): void {
    const activeTeamId = this.teamContext.activeTeamId();

    if (!activeTeamId) {
      return;
    }

    this.eventsService
      .updateEvent(activeTeamId, eventId, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          this.successMessage.set('Инициатива поздравления сохранена');
          this.replaceEvent(event);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'сохранить инициативу'));
        },
      });
  }

  private replaceEvent(updatedEvent: CelebrationEvent): void {
    this.events.update((events) =>
      events
        .map((event) => (event.id === updatedEvent.id ? updatedEvent : event))
        .sort(this.sortEvents),
    );
  }

  private sortEvents(left: CelebrationEvent, right: CelebrationEvent): number {
    return (
      left.date.localeCompare(right.date) ||
      left.person.fullName.localeCompare(right.person.fullName)
    );
  }

  private isCreateEventRequest(result: EventDialogResult): result is CreateEventRequest {
    return 'personId' in result;
  }

  private toDateOnly(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private getDaysWord(days: number): string {
    const lastTwoDigits = days % 100;
    const lastDigit = days % 10;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return 'дней';
    }

    if (lastDigit === 1) {
      return 'день';
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
      return 'дня';
    }

    return 'дней';
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

  private getIdeasWord(count: number): string {
    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return 'идей';
    }

    if (lastDigit === 1) {
      return 'идея';
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
      return 'идеи';
    }

    return 'идей';
  }

  private getActionErrorMessage(error: unknown, action: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return `Не удалось ${action}: frontend не смог отправить запрос.`;
    }

    if (error.status === 0) {
      return `Не удалось ${action}: backend недоступен или нет сети.`;
    }

    if (error.status === 400) {
      return `Не удалось ${action}: проверьте данные формы.`;
    }

    if (error.status === 401) {
      return `Не удалось ${action}: войдите в аккаунт заново.`;
    }

    if (error.status === 404) {
      return `Не удалось ${action}: данные не найдены.`;
    }

    if (error.status === 409) {
      return `Не удалось ${action}: активная инициатива на эту дату уже существует.`;
    }

    return `Не удалось ${action}: запрос завершился ошибкой.`;
  }
}
