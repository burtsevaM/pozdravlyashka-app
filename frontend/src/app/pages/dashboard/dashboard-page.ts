import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs';
import { UpcomingBirthday } from '../../core/models/person.models';
import { PeopleService } from '../../core/services/people.service';
import { TeamContextService } from '../../core/services/team-context.service';

type DashboardCard = {
  title: string;
  subtitle: string;
  description: string;
  icon: string;
};

@Component({
  selector: 'app-dashboard-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly peopleService = inject(PeopleService);
  protected readonly teamContext = inject(TeamContextService);

  protected readonly teamNameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(120)],
  });

  protected readonly upcomingBirthdays = signal<UpcomingBirthday[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isCreatingTeam = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly cards: DashboardCard[] = [
    {
      title: 'История подарков',
      subtitle: 'Прошлые идеи',
      description: 'Будущая история поможет не повторять подарки и учитывать предпочтения.',
      icon: 'redeem',
    },
    {
      title: 'Голосование за подарок',
      subtitle: 'Коллективный выбор',
      description: 'Команда сможет предлагать идеи и выбирать лучший вариант для события.',
      icon: 'how_to_vote',
    },
    {
      title: 'Напоминания',
      subtitle: 'Контроль сроков',
      description: 'Уведомления будут помогать вовремя собрать деньги и купить подарок.',
      icon: 'notifications_active',
    },
  ];

  ngOnInit(): void {
    this.loadTeamsAndBirthdays();
  }

  protected createTeam(): void {
    if (this.teamNameControl.invalid) {
      this.teamNameControl.markAsTouched();
      return;
    }

    const name = this.teamNameControl.value.trim();

    if (!name) {
      this.teamNameControl.setErrors({ required: true });
      return;
    }

    this.isCreatingTeam.set(true);
    this.errorMessage.set(null);

    this.teamContext
      .createTeam(name)
      .pipe(
        finalize(() => this.isCreatingTeam.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.teamNameControl.reset('');
          this.loadUpcomingBirthdays();
        },
        error: () => this.errorMessage.set('Не удалось создать коллектив'),
      });
  }

  protected selectTeam(teamId: string): void {
    this.teamContext.setActiveTeam(teamId);
    this.loadUpcomingBirthdays();
  }

  protected formatBirthdayDate(value: string): string {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
    }).format(new Date(`${value}T00:00:00`));
  }

  protected getDaysLabel(daysUntil: number): string {
    if (daysUntil === 0) {
      return 'сегодня';
    }

    const lastTwoDigits = daysUntil % 100;
    const lastDigit = daysUntil % 10;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return `через ${daysUntil} дней`;
    }

    if (lastDigit === 1) {
      return `через ${daysUntil} день`;
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
      return `через ${daysUntil} дня`;
    }

    return `через ${daysUntil} дней`;
  }

  private loadTeamsAndBirthdays(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.teamContext
      .loadTeams()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.loadUpcomingBirthdays(),
        error: () => this.errorMessage.set('Не удалось загрузить коллективы'),
      });
  }

  private loadUpcomingBirthdays(): void {
    const activeTeamId = this.teamContext.activeTeamId();

    if (!activeTeamId) {
      this.upcomingBirthdays.set([]);
      return;
    }

    this.peopleService
      .getUpcomingBirthdays(activeTeamId, 30)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (birthdays) => this.upcomingBirthdays.set(birthdays),
        error: () => this.errorMessage.set('Не удалось загрузить ближайшие дни рождения'),
      });
  }
}
