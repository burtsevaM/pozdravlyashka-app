import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { CreatePersonRequest, Person, UpdatePersonRequest } from '../../core/models/person.models';
import { PeopleService } from '../../core/services/people.service';
import { TeamContextService } from '../../core/services/team-context.service';
import { PersonDialogComponent } from './person-dialog.component';

@Component({
  selector: 'app-people-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './people-page.html',
  styleUrl: './people-page.scss',
})
export class PeoplePage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly peopleService = inject(PeopleService);
  private readonly window = inject(DOCUMENT).defaultView;
  protected readonly teamContext = inject(TeamContextService);

  protected readonly people = signal<Person[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.teamContext
      .loadTeams()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadPeople(),
        error: () => this.errorMessage.set('Не удалось загрузить коллективы'),
      });
  }

  protected openCreateDialog(): void {
    this.successMessage.set(null);

    const dialogRef = this.dialog.open<PersonDialogComponent, undefined, CreatePersonRequest>(
      PersonDialogComponent,
      {
        width: 'min(680px, calc(100vw - 32px))',
      },
    );

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          return;
        }

        this.createPerson(result);
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
        next: () => {
          this.successMessage.set('Участник архивирован');
          this.loadPeople();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getPeopleActionErrorMessage(error, 'архивировать участника'));
        },
      });
  }

  protected formatBirthDate(value: string): string {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
  }

  protected loadPeople(): void {
    const activeTeamId = this.teamContext.activeTeamId();

    if (!activeTeamId) {
      this.people.set([]);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.peopleService
      .getPeople(activeTeamId)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (people) => this.people.set(people),
        error: () => this.errorMessage.set('Не удалось загрузить участников'),
      });
  }

  private createPerson(data: CreatePersonRequest): void {
    const activeTeamId = this.teamContext.activeTeamId();

    if (!activeTeamId) {
      return;
    }

    this.peopleService
      .createPerson(activeTeamId, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successMessage.set('Участник добавлен');
          this.loadPeople();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getPeopleActionErrorMessage(error, 'добавить участника'));
        },
      });
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
          this.successMessage.set('Участник сохранен');
          this.loadPeople();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getPeopleActionErrorMessage(error, 'сохранить участника'));
        },
      });
  }

  private getPeopleActionErrorMessage(error: unknown, action: string): string {
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

    return `Не удалось ${action}: запрос завершился ошибкой.`;
  }
}
