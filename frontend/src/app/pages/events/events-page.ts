import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { finalize, forkJoin } from 'rxjs';
import {
  CelebrationEvent,
  CreateEventRequest,
  EventStatus,
  UpdateEventRequest,
} from '../../core/models/event.models';
import {
  CreateGiftIdeaRequest,
  GiftIdea,
} from '../../core/models/gift-idea.models';
import { Person } from '../../core/models/person.models';
import { EventsService } from '../../core/services/events.service';
import { PeopleService } from '../../core/services/people.service';
import { TeamContextService } from '../../core/services/team-context.service';
import {
  EventDialogComponent,
  EventDialogData,
  EventDialogResult,
} from './event-dialog.component';

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
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './events-page.html',
  styleUrl: './events-page.scss',
})
export class EventsPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly eventsService = inject(EventsService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly peopleService = inject(PeopleService);
  protected readonly teamContext = inject(TeamContextService);

  protected readonly events = signal<CelebrationEvent[]>([]);
  protected readonly people = signal<Person[]>([]);
  protected readonly selectedEvent = signal<CelebrationEvent | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isGiftIdeaSaving = signal(false);
  protected readonly editingGiftIdeaId = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly giftIdeaForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    description: ['', [Validators.maxLength(1000)]],
    price: [null as number | null, [Validators.min(0)]],
    link: ['', [Validators.maxLength(500)]],
  });

  protected readonly statusOptions: EventStatusOption[] = [
    { value: 'PLANNED', label: 'Запланирована' },
    { value: 'IN_PROGRESS', label: 'В работе' },
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
          const selectedEventId = this.selectedEvent()?.id;
          this.selectedEvent.set(
            selectedEventId
              ? events.find((event) => event.id === selectedEventId) ?? null
              : null,
          );
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

    this.eventsService
      .getEvent(activeTeamId, event.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (loadedEvent) => {
          this.selectedEvent.set(loadedEvent);
          this.replaceEvent(loadedEvent);
          this.cancelGiftIdeaEditing();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'открыть инициативу'));
        },
      });
  }

  protected submitGiftIdea(): void {
    const event = this.selectedEvent();
    const activeTeamId = this.teamContext.activeTeamId();

    if (!event || !activeTeamId) {
      return;
    }

    if (this.giftIdeaForm.invalid) {
      this.giftIdeaForm.markAllAsTouched();
      return;
    }

    const data = this.getGiftIdeaFormData();
    const editingGiftIdeaId = this.editingGiftIdeaId();
    const request$ = editingGiftIdeaId
      ? this.eventsService.updateGiftIdea(activeTeamId, event.id, editingGiftIdeaId, data)
      : this.eventsService.createGiftIdea(activeTeamId, event.id, data);

    this.isGiftIdeaSaving.set(true);
    this.errorMessage.set(null);

    request$
      .pipe(
        finalize(() => this.isGiftIdeaSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (giftIdeas) => {
          this.successMessage.set(
            editingGiftIdeaId ? 'Идея подарка сохранена' : 'Идея подарка добавлена',
          );
          this.applyGiftIdeas(event.id, giftIdeas);
          this.cancelGiftIdeaEditing();
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            this.getActionErrorMessage(
              error,
              editingGiftIdeaId ? 'сохранить идею подарка' : 'добавить идею',
            ),
          );
        },
      });
  }

  protected editGiftIdea(idea: GiftIdea): void {
    this.editingGiftIdeaId.set(idea.id);
    this.giftIdeaForm.setValue({
      title: idea.title,
      description: idea.description ?? '',
      price: idea.price,
      link: idea.link ?? '',
    });
  }

  protected cancelGiftIdeaEditing(): void {
    this.editingGiftIdeaId.set(null);
    this.giftIdeaForm.reset({
      title: '',
      description: '',
      price: null,
      link: '',
    });
  }

  protected deleteGiftIdea(idea: GiftIdea): void {
    const event = this.selectedEvent();
    const activeTeamId = this.teamContext.activeTeamId();

    if (!event || !activeTeamId) {
      return;
    }

    this.eventsService
      .deleteGiftIdea(activeTeamId, event.id, idea.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (giftIdeas) => {
          this.successMessage.set('Идея подарка удалена');
          this.applyGiftIdeas(event.id, giftIdeas);
          if (this.editingGiftIdeaId() === idea.id) {
            this.cancelGiftIdeaEditing();
          }
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'удалить идею подарка'));
        },
      });
  }

  protected voteForGiftIdea(idea: GiftIdea): void {
    const event = this.selectedEvent();
    const activeTeamId = this.teamContext.activeTeamId();

    if (!event || !activeTeamId) {
      return;
    }

    this.eventsService
      .voteForGiftIdea(activeTeamId, event.id, idea.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (giftIdeas) => {
          this.successMessage.set('Голос учтен');
          this.applyGiftIdeas(event.id, giftIdeas);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'проголосовать'));
        },
      });
  }

  protected removeVote(): void {
    const event = this.selectedEvent();
    const activeTeamId = this.teamContext.activeTeamId();

    if (!event || !activeTeamId) {
      return;
    }

    this.eventsService
      .removeVote(activeTeamId, event.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (giftIdeas) => {
          this.successMessage.set('Голос снят');
          this.applyGiftIdeas(event.id, giftIdeas);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'снять голос'));
        },
      });
  }

  protected selectFinalGift(idea: GiftIdea): void {
    const event = this.selectedEvent();
    const activeTeamId = this.teamContext.activeTeamId();

    if (!event || !activeTeamId) {
      return;
    }

    this.eventsService
      .selectFinalGift(activeTeamId, event.id, idea.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedEvent) => {
          this.successMessage.set('Итоговый подарок выбран');
          this.replaceEvent(updatedEvent);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'выбрать итоговый подарок'));
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

  protected formatOptionalMoney(value: number | null): string {
    return value === null ? 'Цена не указана' : this.formatMoney(value);
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
          this.selectedEvent.set(event);
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

    if (this.selectedEvent()?.id === updatedEvent.id) {
      this.selectedEvent.set(updatedEvent);
    }
  }

  private applyGiftIdeas(eventId: string, giftIdeas: GiftIdea[]): void {
    const selectedGiftIdea = giftIdeas.find((idea) => idea.isSelected) ?? null;
    const selectedGiftIdeaPatch = {
      selectedGiftIdeaId: selectedGiftIdea?.id ?? null,
      selectedGiftIdea: selectedGiftIdea
        ? {
            id: selectedGiftIdea.id,
            title: selectedGiftIdea.title,
            description: selectedGiftIdea.description,
            price: selectedGiftIdea.price,
            link: selectedGiftIdea.link,
            proposedById: selectedGiftIdea.proposedById,
            proposedByName: selectedGiftIdea.proposedByName,
          }
        : null,
    };

    this.events.update((events) =>
      events.map((event) =>
        event.id === eventId ? { ...event, giftIdeas, ...selectedGiftIdeaPatch } : event,
      ),
    );

    this.selectedEvent.update((event) =>
      event?.id === eventId ? { ...event, giftIdeas, ...selectedGiftIdeaPatch } : event,
    );
  }

  private getGiftIdeaFormData(): CreateGiftIdeaRequest {
    const value = this.giftIdeaForm.getRawValue();

    return {
      title: value.title.trim(),
      description: value.description.trim() || null,
      price: value.price,
      link: value.link.trim() || null,
    };
  }

  private sortEvents(left: CelebrationEvent, right: CelebrationEvent): number {
    return left.date.localeCompare(right.date) || left.person.fullName.localeCompare(right.person.fullName);
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
      if (action.includes('удалить идею')) {
        return 'Нельзя удалить итоговый подарок.';
      }

      return `Не удалось ${action}: активная инициатива на эту дату уже существует.`;
    }

    return `Не удалось ${action}: запрос завершился ошибкой.`;
  }
}
