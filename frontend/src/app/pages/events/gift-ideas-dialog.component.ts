import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { finalize } from 'rxjs';
import { CelebrationEvent, EventStatus } from '../../core/models/event.models';
import { CreateGiftIdeaRequest, GiftIdea } from '../../core/models/gift-idea.models';
import { EventsService } from '../../core/services/events.service';

export type GiftIdeasDialogData = {
  teamId: string;
  event: CelebrationEvent;
};

export type GiftIdeasDialogResult = CelebrationEvent | undefined;

type EventStatusOption = {
  value: EventStatus;
  label: string;
};

@Component({
  selector: 'app-gift-ideas-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './gift-ideas-dialog.component.html',
  styleUrl: './gift-ideas-dialog.component.scss',
})
export class GiftIdeasDialogComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef =
    inject<MatDialogRef<GiftIdeasDialogComponent, GiftIdeasDialogResult>>(MatDialogRef);
  private readonly eventsService = inject(EventsService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly window = inject(DOCUMENT).defaultView;
  protected readonly data = inject<GiftIdeasDialogData>(MAT_DIALOG_DATA);

  protected readonly event = signal<CelebrationEvent>(this.data.event);
  protected readonly isSaving = signal(false);
  protected readonly isFormOpen = signal(false);
  protected readonly editingGiftIdeaId = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    description: ['', [Validators.maxLength(1000)]],
    price: ['', [Validators.min(0)]],
    link: ['', [Validators.maxLength(500)]],
  });

  protected readonly controls = this.form.controls;

  private hasChanges = false;

  private readonly statusOptions: EventStatusOption[] = [
    { value: 'PLANNED', label: 'Запланирована' },
    { value: 'IN_PROGRESS', label: 'Выбор подарка' },
    { value: 'COMPLETED', label: 'Завершена' },
    { value: 'CANCELLED', label: 'Отменена' },
  ];

  protected get giftIdeas(): GiftIdea[] {
    return this.event().giftIdeas;
  }

  protected get leadingGiftIdea(): GiftIdea | null {
    return this.getLeadingGiftIdea(this.giftIdeas);
  }

  protected get totalVotesCount(): number {
    return this.giftIdeas.reduce((total, idea) => total + idea.voteCount, 0);
  }

  protected openCreateForm(): void {
    this.editingGiftIdeaId.set(null);
    this.form.reset({
      title: '',
      description: '',
      price: '',
      link: '',
    });
    this.isFormOpen.set(true);
    this.errorMessage.set(null);
  }

  protected openEditForm(idea: GiftIdea): void {
    this.editingGiftIdeaId.set(idea.id);
    this.form.setValue({
      title: idea.title,
      description: idea.description ?? '',
      price: idea.price === null ? '' : String(idea.price),
      link: idea.link ?? '',
    });
    this.isFormOpen.set(true);
    this.errorMessage.set(null);
  }

  protected closeForm(): void {
    this.isFormOpen.set(false);
    this.editingGiftIdeaId.set(null);
    this.form.reset({
      title: '',
      description: '',
      price: '',
      link: '',
    });
  }

  protected submitGiftIdea(): void {
    const title = this.controls.title.value.trim();

    if (!title) {
      this.controls.title.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const event = this.event();
    const data = this.getGiftIdeaFormData();
    const editingGiftIdeaId = this.editingGiftIdeaId();
    const request$ = editingGiftIdeaId
      ? this.eventsService.updateGiftIdea(this.data.teamId, event.id, editingGiftIdeaId, data)
      : this.eventsService.createGiftIdea(this.data.teamId, event.id, data);

    this.isSaving.set(true);
    this.errorMessage.set(null);

    request$
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (giftIdeas) => {
          this.successMessage.set(
            editingGiftIdeaId ? 'Идея подарка сохранена' : 'Идея подарка добавлена',
          );
          this.applyGiftIdeas(giftIdeas);
          this.closeForm();
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

  protected deleteGiftIdea(idea: GiftIdea): void {
    if (idea.isSelected) {
      this.errorMessage.set(
        'Нельзя удалить итоговый подарок. Сначала выберите другой итоговый подарок.',
      );
      return;
    }

    const confirmed = this.window?.confirm(`Удалить идею подарка «${idea.title}»?`) ?? false;

    if (!confirmed) {
      return;
    }

    const event = this.event();
    this.errorMessage.set(null);

    this.eventsService
      .deleteGiftIdea(this.data.teamId, event.id, idea.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (giftIdeas) => {
          this.successMessage.set('Идея подарка удалена');
          this.applyGiftIdeas(giftIdeas);
          if (this.editingGiftIdeaId() === idea.id) {
            this.closeForm();
          }
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'удалить идею подарка'));
        },
      });
  }

  protected voteForGiftIdea(idea: GiftIdea): void {
    const event = this.event();
    this.errorMessage.set(null);

    this.eventsService
      .voteForGiftIdea(this.data.teamId, event.id, idea.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (giftIdeas) => {
          this.successMessage.set('Голос учтен');
          this.applyGiftIdeas(giftIdeas);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'проголосовать'));
        },
      });
  }

  protected removeVote(): void {
    const event = this.event();
    this.errorMessage.set(null);

    this.eventsService
      .removeVote(this.data.teamId, event.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (giftIdeas) => {
          this.successMessage.set('Голос снят');
          this.applyGiftIdeas(giftIdeas);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'снять голос'));
        },
      });
  }

  protected selectFinalGift(idea: GiftIdea): void {
    const event = this.event();
    this.errorMessage.set(null);

    this.eventsService
      .selectFinalGift(this.data.teamId, event.id, idea.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedEvent) => {
          this.successMessage.set('Итоговый подарок выбран');
          this.event.set(updatedEvent);
          this.hasChanges = true;
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getActionErrorMessage(error, 'выбрать итоговый подарок'));
        },
      });
  }

  protected close(): void {
    this.dialogRef.close(this.hasChanges ? this.event() : undefined);
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

  protected getVotesWord(count: number): string {
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

  private applyGiftIdeas(giftIdeas: GiftIdea[]): void {
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
        : this.event().selectedGiftIdea,
    };

    this.event.update((event) => ({
      ...event,
      giftIdeas,
      ...selectedGiftIdeaPatch,
    }));
    this.hasChanges = true;
  }

  private getGiftIdeaFormData(): CreateGiftIdeaRequest {
    const value = this.form.getRawValue();
    const price = String(value.price).trim();

    return {
      title: value.title.trim(),
      description: value.description.trim() || null,
      price: price ? Number(price) : null,
      link: value.link.trim() || null,
    };
  }

  private getLeadingGiftIdea(giftIdeas: GiftIdea[]): GiftIdea | null {
    return giftIdeas.reduce<GiftIdea | null>((leader, idea) => {
      if (!leader || idea.voteCount > leader.voteCount) {
        return idea;
      }

      return leader;
    }, null);
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

    if (error.status === 409 && action.includes('удалить идею')) {
      return 'Нельзя удалить итоговый подарок. Сначала выберите другой итоговый подарок.';
    }

    return `Не удалось ${action}: запрос завершился ошибкой.`;
  }
}
