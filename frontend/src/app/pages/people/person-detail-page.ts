import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import {
  CreateEventRequest,
  EVENT_OCCASION_LABELS,
  EventOccasion,
  EventStatus,
} from '../../core/models/event.models';
import {
  CreateGiftHistoryRequest,
  GiftHistory,
  UpdateGiftHistoryRequest,
} from '../../core/models/gift-history.models';
import { Person, PersonStatus, UpdatePersonRequest } from '../../core/models/person.models';
import { EventsService } from '../../core/services/events.service';
import { GiftHistoryService } from '../../core/services/gift-history.service';
import { PeopleService } from '../../core/services/people.service';
import { TeamContextService } from '../../core/services/team-context.service';
import {
  EventDialogComponent,
  EventDialogData,
  EventDialogResult,
} from '../events/event-dialog.component';
import { GiftHistoryDialogComponent } from './gift-history-dialog.component';
import { PersonDialogComponent } from './person-dialog.component';

@Component({
  selector: 'app-person-detail-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './person-detail-page.html',
  styleUrl: './person-detail-page.scss',
})
export class PersonDetailPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly eventsService = inject(EventsService);
  private readonly giftHistoryService = inject(GiftHistoryService);
  private readonly peopleService = inject(PeopleService);
  private readonly route = inject(ActivatedRoute);
  private readonly window = inject(DOCUMENT).defaultView;
  protected readonly teamContext = inject(TeamContextService);

  protected readonly person = signal<Person | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly giftHistory = computed(() => this.person()?.giftHistory ?? []);
  protected readonly celebrationEvents = computed(() => this.person()?.celebrationEvents ?? []);

  ngOnInit(): void {
    this.teamContext
      .loadTeams()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadPerson(),
        error: () => this.errorMessage.set('Не удалось загрузить коллективы'),
      });
  }

  protected loadPerson(): void {
    const activeTeamId = this.teamContext.activeTeamId();
    const personId = this.route.snapshot.paramMap.get('personId');

    if (!activeTeamId || !personId) {
      this.person.set(null);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.peopleService
      .getPersonDetails(activeTeamId, personId)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (person) => this.person.set(person),
        error: (error: unknown) => {
          this.errorMessage.set(
            this.getActionErrorMessage(error, 'загрузить карточку участника'),
          );
        },
      });
  }

  protected openEditDialog(person: Person): void {
    this.successMessage.set(null);

    const dialogRef = this.dialog.open<
      PersonDialogComponent,
      { person: Person },
      UpdatePersonRequest
    >(PersonDialogComponent, {
      width: 'min(680px, calc(100vw - 32px))',
      data: { person },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          return;
        }

        this.updatePerson(person.id, result);
      });
  }

  protected archivePerson(person: Person): void {
    const confirmed = this.window?.confirm(`Архивировать участника «${person.fullName}»?`) ?? false;

    if (!confirmed) {
      return;
    }

    const activeTeamId = this.teamContext.activeTeamId();

    if (!activeTeamId) {
      return;
    }

    this.peopleService
      .archivePerson(activeTeamId, person.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedPerson) => {
          this.successMessage.set('Участник архивирован');
          this.person.update((currentPerson) =>
            currentPerson ? { ...currentPerson, status: updatedPerson.status } : updatedPerson,
          );
          this.loadPerson();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'архивировать участника'));
        },
      });
  }

  protected openCreateGiftDialog(): void {
    const person = this.person();

    if (!person) {
      return;
    }

    const dialogRef = this.dialog.open<
      GiftHistoryDialogComponent,
      undefined,
      CreateGiftHistoryRequest
    >(GiftHistoryDialogComponent, {
      width: 'min(640px, calc(100vw - 32px))',
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          return;
        }

        this.createGiftHistory(person.id, result);
      });
  }

  protected openEditGiftDialog(giftHistory: GiftHistory): void {
    const person = this.person();

    if (!person) {
      return;
    }

    const dialogRef = this.dialog.open<
      GiftHistoryDialogComponent,
      { giftHistory: GiftHistory },
      UpdateGiftHistoryRequest
    >(GiftHistoryDialogComponent, {
      width: 'min(640px, calc(100vw - 32px))',
      data: { giftHistory },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          return;
        }

        this.updateGiftHistory(person.id, giftHistory.id, result);
      });
  }

  protected deleteGiftHistory(giftHistory: GiftHistory): void {
    const person = this.person();
    const activeTeamId = this.teamContext.activeTeamId();

    if (!person || !activeTeamId) {
      return;
    }

    const confirmed =
      this.window?.confirm(`Удалить подарок «${giftHistory.giftName}» из истории?`) ?? false;

    if (!confirmed) {
      return;
    }

    this.giftHistoryService
      .deleteGiftHistory(activeTeamId, person.id, giftHistory.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successMessage.set('Запись истории подарков удалена');
          this.loadPerson();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'удалить историю подарка'));
        },
      });
  }

  protected openCreateEventDialog(): void {
    const person = this.person();

    if (!person) {
      return;
    }

    const dialogRef = this.dialog.open<EventDialogComponent, EventDialogData, EventDialogResult>(
      EventDialogComponent,
      {
        width: 'min(600px, calc(100vw - 32px))',
        data: {
          people: [person],
          defaultPersonId: person.id,
          defaultDate: this.getNextBirthday(person.birthDate),
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
    const labels: Record<EventStatus, string> = {
      PLANNED: 'Запланирована',
      IN_PROGRESS: 'В работе',
      COMPLETED: 'Завершена',
      CANCELLED: 'Отменена',
    };

    return labels[status];
  }

  protected getOccasionLabel(occasion: EventOccasion): string {
    return EVENT_OCCASION_LABELS[occasion];
  }

  protected getPersonStatusLabel(status: PersonStatus): string {
    const labels: Record<PersonStatus, string> = {
      ACTIVE: 'Активный',
      INACTIVE: 'Неактивный',
      ARCHIVED: 'В архиве',
    };

    return labels[status];
  }

  protected formatGiftYear(year: number | null): string {
    return year === null ? 'Год не указан' : String(year);
  }

  private updatePerson(personId: string, data: UpdatePersonRequest): void {
    const activeTeamId = this.teamContext.activeTeamId();

    if (!activeTeamId) {
      return;
    }

    this.peopleService
      .updatePerson(activeTeamId, personId, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successMessage.set('Карточка участника сохранена');
          this.loadPerson();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'сохранить карточку участника'));
        },
      });
  }

  private createGiftHistory(personId: string, data: CreateGiftHistoryRequest): void {
    const activeTeamId = this.teamContext.activeTeamId();

    if (!activeTeamId) {
      return;
    }

    this.giftHistoryService
      .createGiftHistory(activeTeamId, personId, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successMessage.set('История подарка сохранена');
          this.loadPerson();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'сохранить историю подарка'));
        },
      });
  }

  private updateGiftHistory(
    personId: string,
    giftHistoryId: string,
    data: UpdateGiftHistoryRequest,
  ): void {
    const activeTeamId = this.teamContext.activeTeamId();

    if (!activeTeamId) {
      return;
    }

    this.giftHistoryService
      .updateGiftHistory(activeTeamId, personId, giftHistoryId, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successMessage.set('История подарка обновлена');
          this.loadPerson();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'сохранить историю подарка'));
        },
      });
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
        next: () => {
          this.successMessage.set('Инициатива поздравления создана');
          this.loadPerson();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'создать инициативу'));
        },
      });
  }

  private getNextBirthday(birthDate: string): string {
    const today = new Date();
    const [, month, day] = birthDate.split('-').map(Number);
    let nextBirthday = new Date(Date.UTC(today.getFullYear(), month - 1, day));

    if (nextBirthday.getTime() < this.toDateOnly(today).getTime()) {
      nextBirthday = new Date(Date.UTC(today.getFullYear() + 1, month - 1, day));
    }

    return nextBirthday.toISOString().slice(0, 10);
  }

  private toDateOnly(date: Date): Date {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  private isCreateEventRequest(result: EventDialogResult): result is CreateEventRequest {
    return 'personId' in result;
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
