import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { finalize, forkJoin } from 'rxjs';
import {
  Contribution,
  ContributionStatus,
  ContributionSummary,
} from '../../core/models/contribution.models';
import { Delegation } from '../../core/models/delegation.models';
import {
  CelebrationEvent,
  EVENT_OCCASION_LABELS,
  EventOccasion,
  EventStatus,
  PersonCelebrationEvent,
} from '../../core/models/event.models';
import { GiftHistory } from '../../core/models/gift-history.models';
import { Person, PersonStatus } from '../../core/models/person.models';
import { TeamMember } from '../../core/models/team.models';
import { ContributionsService } from '../../core/services/contributions.service';
import { DelegationsService } from '../../core/services/delegations.service';
import { EventsService } from '../../core/services/events.service';
import { AuthService } from '../../core/services/auth.service';
import { PeopleService } from '../../core/services/people.service';
import { TeamsService } from '../../core/services/teams.service';

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

type ApiErrorResponse = {
  message?: string | string[];
};

@Component({
  selector: 'app-person-card-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './person-card-dialog.component.html',
  styleUrl: './person-card-dialog.component.scss',
})
export class PersonCardDialogComponent implements OnInit {
  private readonly data = inject<PersonCardDialogData>(MAT_DIALOG_DATA);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly contributionsService = inject(ContributionsService);
  private readonly delegationsService = inject(DelegationsService);
  private readonly eventsService = inject(EventsService);
  private readonly peopleService = inject(PeopleService);
  private readonly teamsService = inject(TeamsService);

  protected readonly person = signal<Person | null>(null);
  protected readonly currentEvent = signal<CelebrationEvent | null>(this.data.currentEvent ?? null);
  protected readonly teamMembers = signal<TeamMember[]>([]);
  protected readonly contributionSummary = signal<ContributionSummary | null>(null);
  protected readonly delegations = signal<Delegation[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isManagementLoading = signal(false);
  protected readonly loadErrorMessage = signal<string | null>(null);
  protected readonly actionErrorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly editingContributionId = signal<string | null>(null);
  protected readonly canManageEventRoles = computed(() => {
    const event = this.currentEvent();
    const userId = this.authService.currentUser()?.id;

    if (!event || !userId) {
      return false;
    }

    if (event.organizerId === userId) {
      return true;
    }

    const membership = this.teamMembers().find((member) => member.userId === userId);
    return membership?.role === 'OWNER' || membership?.role === 'ADMIN';
  });

  protected readonly contributionForm = this.formBuilder.group({
    userId: ['', [Validators.required]],
    amount: ['', [Validators.required, Validators.min(0.01)]],
    status: ['PENDING' as ContributionStatus, [Validators.required]],
    comment: [''],
  });

  protected readonly contributionEditForm = this.formBuilder.group({
    amount: ['', [Validators.required, Validators.min(0.01)]],
    status: ['PENDING' as ContributionStatus, [Validators.required]],
    comment: [''],
  });

  protected readonly deputyForm = this.formBuilder.group({
    deputyId: [''],
  });

  protected readonly delegationForm = this.formBuilder.group({
    toUserId: ['', [Validators.required]],
    startDate: ['', [Validators.required]],
    endDate: [''],
    reason: [''],
  });

  protected readonly contributionStatusOptions: { value: ContributionStatus; label: string }[] = [
    { value: 'PENDING', label: 'Не сдал' },
    { value: 'PAID', label: 'Сдал' },
    { value: 'CANCELLED', label: 'Отменен' },
  ];

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
    this.loadManagementData();
  }

  protected get giftHistory(): GiftHistory[] {
    return this.person()?.giftHistory ?? [];
  }

  protected get celebrationEvents(): PersonCelebrationEvent[] {
    return this.person()?.celebrationEvents ?? [];
  }

  protected get availableContributionMembers(): TeamMember[] {
    const usedUserIds = new Set(this.contributionSummary()?.items.map((item) => item.userId) ?? []);

    return this.teamMembers().filter((member) => !usedUserIds.has(member.userId));
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

  protected getOccasionLabel(occasion: EventOccasion): string {
    return EVENT_OCCASION_LABELS[occasion];
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

  protected getContributionStatusLabel(status: ContributionStatus): string {
    return (
      this.contributionStatusOptions.find((option) => option.value === status)?.label ?? status
    );
  }

  protected getRemainingAmount(summary: ContributionSummary): number | null {
    if (summary.budget === null) {
      return null;
    }

    return Math.max(summary.budget - summary.paidAmount, 0);
  }

  protected addContribution(): void {
    const event = this.currentEvent();

    if (!event || this.contributionForm.invalid) {
      this.contributionForm.markAllAsTouched();
      return;
    }

    const value = this.contributionForm.getRawValue();
    this.actionErrorMessage.set(null);

    this.contributionsService
      .createContribution(this.data.teamId, event.id, {
        userId: value.userId,
        amount: Number(value.amount),
        status: value.status,
        comment: value.comment.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => {
          this.contributionSummary.set(summary);
          this.successMessage.set('Взнос добавлен');
          this.contributionForm.reset({
            userId: '',
            amount: '',
            status: 'PENDING',
            comment: '',
          });
          this.refreshCurrentEvent(event.id);
        },
        error: (error: unknown) => {
          this.actionErrorMessage.set(this.getActionErrorMessage(error, 'добавить взнос'));
        },
      });
  }

  protected startContributionEdit(contribution: Contribution): void {
    this.editingContributionId.set(contribution.id);
    this.contributionEditForm.setValue({
      amount: String(contribution.amount),
      status: contribution.status,
      comment: contribution.comment ?? '',
    });
  }

  protected cancelContributionEdit(): void {
    this.editingContributionId.set(null);
  }

  protected saveContribution(contributionId: string): void {
    const event = this.currentEvent();

    if (!event || this.contributionEditForm.invalid) {
      this.contributionEditForm.markAllAsTouched();
      return;
    }

    const value = this.contributionEditForm.getRawValue();
    this.actionErrorMessage.set(null);

    this.contributionsService
      .updateContribution(this.data.teamId, event.id, contributionId, {
        amount: Number(value.amount),
        status: value.status,
        comment: value.comment.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => {
          this.contributionSummary.set(summary);
          this.editingContributionId.set(null);
          this.successMessage.set('Взнос сохранен');
          this.refreshCurrentEvent(event.id);
        },
        error: (error: unknown) => {
          this.actionErrorMessage.set(this.getActionErrorMessage(error, 'сохранить взнос'));
        },
      });
  }

  protected updateContributionStatus(contribution: Contribution, status: ContributionStatus): void {
    const event = this.currentEvent();

    if (!event || contribution.status === status) {
      return;
    }

    this.actionErrorMessage.set(null);

    this.contributionsService
      .updateContributionStatus(this.data.teamId, event.id, contribution.id, { status })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => {
          this.contributionSummary.set(summary);
          this.successMessage.set('Статус взноса обновлен');
          this.refreshCurrentEvent(event.id);
        },
        error: (error: unknown) => {
          this.actionErrorMessage.set(this.getActionErrorMessage(error, 'изменить статус взноса'));
        },
      });
  }

  protected deleteContribution(contributionId: string): void {
    const event = this.currentEvent();

    if (!event) {
      return;
    }

    this.actionErrorMessage.set(null);

    this.contributionsService
      .deleteContribution(this.data.teamId, event.id, contributionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => {
          this.contributionSummary.set(summary);
          this.successMessage.set('Взнос удален');
          this.refreshCurrentEvent(event.id);
        },
        error: (error: unknown) => {
          this.actionErrorMessage.set(this.getActionErrorMessage(error, 'удалить взнос'));
        },
      });
  }

  protected saveDeputy(): void {
    const event = this.currentEvent();

    if (!event) {
      return;
    }

    if (!this.canManageEventRoles()) {
      this.actionErrorMessage.set(
        'Изменять заместителя и организатора может только организатор, владелец или администратор коллектива.',
      );
      return;
    }

    const deputyId = this.deputyForm.controls.deputyId.value || null;
    this.actionErrorMessage.set(null);

    this.delegationsService
      .assignDeputy(this.data.teamId, event.id, deputyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedEvent) => {
          this.currentEvent.set(updatedEvent);
          this.deputyForm.controls.deputyId.setValue(updatedEvent.deputyId ?? '');
          this.successMessage.set('Заместитель сохранен');
        },
        error: (error: unknown) => {
          this.actionErrorMessage.set(this.getActionErrorMessage(error, 'назначить заместителя'));
        },
      });
  }

  protected removeDeputy(): void {
    const event = this.currentEvent();

    if (!event) {
      return;
    }

    if (!this.canManageEventRoles()) {
      this.actionErrorMessage.set(
        'Изменять заместителя и организатора может только организатор, владелец или администратор коллектива.',
      );
      return;
    }

    this.actionErrorMessage.set(null);

    this.delegationsService
      .removeDeputy(this.data.teamId, event.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedEvent) => {
          this.currentEvent.set(updatedEvent);
          this.deputyForm.controls.deputyId.setValue('');
          this.successMessage.set('Заместитель снят');
        },
        error: (error: unknown) => {
          this.actionErrorMessage.set(this.getActionErrorMessage(error, 'снять заместителя'));
        },
      });
  }

  protected transferOrganizer(): void {
    const event = this.currentEvent();

    if (!event) {
      return;
    }

    if (!this.canManageEventRoles()) {
      this.actionErrorMessage.set(
        'Изменять заместителя и организатора может только организатор, владелец или администратор коллектива.',
      );
      return;
    }

    if (this.delegationForm.invalid) {
      this.delegationForm.markAllAsTouched();
      return;
    }

    const value = this.delegationForm.getRawValue();
    this.actionErrorMessage.set(null);

    this.delegationsService
      .transferOrganizer(this.data.teamId, event.id, {
        toUserId: value.toUserId,
        startDate: value.startDate,
        endDate: value.endDate || undefined,
        reason: value.reason.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ event: updatedEvent }) => {
          this.currentEvent.set(updatedEvent);
          this.deputyForm.controls.deputyId.setValue(updatedEvent.deputyId ?? '');
          this.delegationForm.reset({
            toUserId: '',
            startDate: '',
            endDate: '',
            reason: '',
          });
          this.successMessage.set('Права организатора переданы');
          this.loadDelegations(updatedEvent.id);
        },
        error: (error: unknown) => {
          this.actionErrorMessage.set(
            this.getActionErrorMessage(error, 'передать права организатора'),
          );
        },
      });
  }

  private loadPerson(): void {
    this.isLoading.set(true);
    this.loadErrorMessage.set(null);

    this.peopleService
      .getPersonDetails(this.data.teamId, this.data.personId)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (person) => this.person.set(person),
        error: (error: unknown) => {
          this.loadErrorMessage.set(
            this.getActionErrorMessage(error, 'загрузить карточку участника'),
          );
        },
      });
  }

  private loadManagementData(): void {
    const event = this.currentEvent();

    if (!event) {
      return;
    }

    this.isManagementLoading.set(true);
    this.actionErrorMessage.set(null);

    forkJoin({
      members: this.teamsService.getTeamMembers(this.data.teamId),
      contributions: this.contributionsService.getContributions(this.data.teamId, event.id),
      delegations: this.delegationsService.getDelegations(this.data.teamId, event.id),
    })
      .pipe(
        finalize(() => this.isManagementLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ members, contributions, delegations }) => {
          this.teamMembers.set(members);
          this.contributionSummary.set(contributions);
          this.delegations.set(delegations);
          this.deputyForm.controls.deputyId.setValue(event.deputyId ?? '');
        },
        error: (error: unknown) => {
          this.actionErrorMessage.set(this.getActionErrorMessage(error, 'загрузить управление'));
        },
      });
  }

  private loadDelegations(eventId: string): void {
    this.delegationsService
      .getDelegations(this.data.teamId, eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (delegations) => this.delegations.set(delegations),
        error: (error: unknown) => {
          this.actionErrorMessage.set(
            this.getActionErrorMessage(error, 'загрузить историю передачи прав'),
          );
        },
      });
  }

  private refreshCurrentEvent(eventId: string): void {
    this.eventsService
      .getEvent(this.data.teamId, eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => this.currentEvent.set(event),
        error: () => undefined,
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

    const backendMessage = this.getBackendErrorMessage(error);

    if (backendMessage) {
      return `Не удалось ${action}: ${backendMessage}`;
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

  private getBackendErrorMessage(error: HttpErrorResponse): string | null {
    const response = error.error as ApiErrorResponse | undefined;
    const message = response?.message;

    if (Array.isArray(message)) {
      return message.join('; ');
    }

    return message ?? null;
  }
}
