import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { finalize } from 'rxjs';
import { EmailStatus } from '../../core/models/settings.models';
import { TeamMember } from '../../core/models/team.models';
import { AuthService } from '../../core/services/auth.service';
import { ImportsService } from '../../core/services/imports.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { SettingsService } from '../../core/services/settings.service';
import { TeamContextService } from '../../core/services/team-context.service';
import { TeamsService } from '../../core/services/teams.service';

type ApiErrorResponse = {
  message?: string | string[];
};

const ADD_TEAM_MEMBER_ACCESS_MESSAGE =
  'У вас нет доступа к добавлению пользователей в коллектив.';

@Component({
  selector: 'app-settings-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly importsService = inject(ImportsService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly settingsService = inject(SettingsService);
  private readonly teamsService = inject(TeamsService);
  protected readonly teamContext = inject(TeamContextService);

  protected readonly profileForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: [{ value: '', disabled: true }],
    birthDate: [''],
  });

  protected readonly teamForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
  });

  protected readonly teamMemberForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });

  protected readonly notificationForm = this.formBuilder.group({
    inAppEnabled: true,
    emailEnabled: true,
    remind14Days: true,
    remind7Days: true,
    remind3Days: true,
    remind1Day: true,
    remindOnDay: true,
  });

  protected readonly emailStatus = signal<EmailStatus | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isSavingProfile = signal(false);
  protected readonly isSavingTeam = signal(false);
  protected readonly isAddingTeamMember = signal(false);
  protected readonly isLoadingTeamMembers = signal(false);
  protected readonly isSavingNotifications = signal(false);
  protected readonly isDownloadingTemplate = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly teamMembers = signal<TeamMember[]>([]);

  protected readonly profileNameControl = this.profileForm.controls.name;
  protected readonly profileBirthDateControl = this.profileForm.controls.birthDate;
  protected readonly teamNameControl = this.teamForm.controls.name;
  protected readonly teamMemberEmailControl = this.teamMemberForm.controls.email;

  protected readonly canEditActiveTeam = computed(() => {
    const role = this.teamContext.activeTeam()?.role;
    return role === 'OWNER' || role === 'ADMIN';
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  protected saveProfile(): void {
    const name = this.profileNameControl.value.trim();

    if (!name) {
      this.profileNameControl.setErrors({ required: true });
      this.profileForm.markAllAsTouched();
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSavingProfile.set(true);
    this.clearMessages();

    this.authService
      .updateProfile({
        name,
        birthDate: this.profileBirthDateControl.value || null,
      })
      .pipe(
        finalize(() => this.isSavingProfile.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ user }) => {
          this.profileForm.patchValue({
            name: user.name,
            email: user.email,
            birthDate: user.birthDate ?? '',
          });
          this.successMessage.set('Профиль сохранен');
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getRequestErrorMessage(error, 'сохранить профиль'));
        },
      });
  }

  protected selectTeam(teamId: string): void {
    this.teamContext.setActiveTeam(teamId);
    this.patchTeamForm();
    this.loadTeamMembers(teamId);
    this.clearMessages();
  }

  protected saveTeam(): void {
    const activeTeam = this.teamContext.activeTeam();
    const name = this.teamNameControl.value.trim();

    if (!activeTeam) {
      this.errorMessage.set('Сначала создайте или выберите коллектив на главной панели.');
      return;
    }

    if (!name) {
      this.teamNameControl.setErrors({ required: true });
      this.teamForm.markAllAsTouched();
      return;
    }

    if (this.teamForm.invalid) {
      this.teamForm.markAllAsTouched();
      return;
    }

    this.isSavingTeam.set(true);
    this.clearMessages();

    this.teamContext
      .updateActiveTeamName(activeTeam.id, name)
      .pipe(
        finalize(() => this.isSavingTeam.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.successMessage.set('Настройки коллектива сохранены'),
        error: (error: unknown) => {
          this.errorMessage.set(
            this.getRequestErrorMessage(error, 'сохранить настройки коллектива'),
          );
        },
      });
  }

  protected addTeamMember(): void {
    const activeTeam = this.teamContext.activeTeam();
    const email = this.teamMemberEmailControl.value.trim().toLowerCase();

    if (!activeTeam) {
      this.errorMessage.set('Сначала создайте или выберите коллектив на главной панели.');
      return;
    }

    if (!this.canEditActiveTeam()) {
      this.errorMessage.set(ADD_TEAM_MEMBER_ACCESS_MESSAGE);
      return;
    }

    if (!email) {
      this.teamMemberEmailControl.setErrors({ required: true });
      this.teamMemberForm.markAllAsTouched();
      return;
    }

    if (this.teamMemberForm.invalid) {
      this.teamMemberForm.markAllAsTouched();
      return;
    }

    this.isAddingTeamMember.set(true);
    this.clearMessages();

    this.teamsService
      .addTeamMember(activeTeam.id, { email, role: 'MEMBER' })
      .pipe(
        finalize(() => this.isAddingTeamMember.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (member) => {
          this.teamMemberForm.reset({ email: '' });
          this.teamMembers.update((members) =>
            this.upsertAndSortTeamMember(members, member),
          );
          this.successMessage.set('Пользователь добавлен в коллектив');
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getTeamMemberRequestErrorMessage(error));
        },
      });
  }

  protected saveNotifications(): void {
    if (this.notificationForm.invalid) {
      return;
    }

    this.isSavingNotifications.set(true);
    this.clearMessages();

    this.notificationsService
      .updateNotificationSettings(this.notificationForm.getRawValue())
      .pipe(
        finalize(() => this.isSavingNotifications.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.successMessage.set('Настройки уведомлений сохранены'),
        error: (error: unknown) => {
          this.errorMessage.set(
            this.getRequestErrorMessage(error, 'сохранить настройки уведомлений'),
          );
        },
      });
  }

  protected downloadTemplate(): void {
    const activeTeamId = this.teamContext.activeTeamId();

    if (!activeTeamId) {
      this.errorMessage.set('Сначала создайте или выберите коллектив на главной панели.');
      return;
    }

    this.isDownloadingTemplate.set(true);
    this.clearMessages();

    this.importsService
      .downloadPeopleImportTemplate(activeTeamId)
      .pipe(
        finalize(() => this.isDownloadingTemplate.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob) => {
          this.saveBlob(blob, 'people-import-template.xlsx');
          this.successMessage.set('Шаблон Excel скачан');
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getRequestErrorMessage(error, 'скачать шаблон'));
        },
      });
  }

  protected openMailpit(): void {
    const url = this.emailStatus()?.mailpitUrl;

    if (!url) {
      return;
    }

    this.document.defaultView?.open(url, '_blank', 'noopener,noreferrer');
  }

  private loadSettings(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService
      .getCurrentUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ user }) => {
          this.profileForm.patchValue({
            name: user.name,
            email: user.email,
            birthDate: user.birthDate ?? '',
          });
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getRequestErrorMessage(error, 'загрузить профиль'));
        },
      });

    this.teamContext
      .loadTeams()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.patchTeamForm();
          this.loadTeamMembers();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getRequestErrorMessage(error, 'загрузить коллективы'));
        },
      });

    this.notificationsService
      .getNotificationSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => this.notificationForm.patchValue(settings),
        error: (error: unknown) => {
          this.errorMessage.set(
            this.getRequestErrorMessage(error, 'загрузить настройки уведомлений'),
          );
        },
      });

    this.settingsService
      .getEmailStatus()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (status) => this.emailStatus.set(status),
        error: (error: unknown) => {
          this.errorMessage.set(
            this.getRequestErrorMessage(error, 'загрузить статус email-напоминаний'),
          );
        },
      });
  }

  private patchTeamForm(): void {
    this.teamForm.patchValue({
      name: this.teamContext.activeTeam()?.name ?? '',
    });
  }

  private loadTeamMembers(teamId = this.teamContext.activeTeamId()): void {
    if (!teamId) {
      this.teamMembers.set([]);
      return;
    }

    this.isLoadingTeamMembers.set(true);

    this.teamsService
      .getTeamMembers(teamId)
      .pipe(
        finalize(() => this.isLoadingTeamMembers.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (members) => this.teamMembers.set(members),
        error: (error: unknown) => {
          this.errorMessage.set(
            this.getRequestErrorMessage(error, 'загрузить участников коллектива'),
          );
        },
      });
  }

  private upsertAndSortTeamMember(members: TeamMember[], member: TeamMember): TeamMember[] {
    return [...members.filter((item) => item.userId !== member.userId), member].sort(
      (first, second) => {
        const nameCompare = first.name.localeCompare(second.name, 'ru');

        if (nameCompare !== 0) {
          return nameCompare;
        }

        return first.email.localeCompare(second.email, 'ru');
      },
    );
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const windowRef = this.document.defaultView;

    if (!windowRef) {
      return;
    }

    const url = windowRef.URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    windowRef.URL.revokeObjectURL(url);
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  private getRequestErrorMessage(error: unknown, action: string): string {
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

    if (error.status === 403) {
      return `Не удалось ${action}: нет доступа или недостаточно прав.`;
    }

    return `Не удалось ${action}: запрос завершился ошибкой.`;
  }

  private getTeamMemberRequestErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Не удалось добавить пользователя в коллектив.';
    }

    const backendMessage = this.getBackendErrorMessage(error);

    if (backendMessage) {
      return backendMessage;
    }

    if (error.status === 0) {
      return 'Не удалось добавить пользователя в коллектив: backend недоступен или нет сети.';
    }

    if (error.status === 401) {
      return 'Не удалось добавить пользователя в коллектив: войдите в аккаунт заново.';
    }

    if (error.status === 403) {
      return ADD_TEAM_MEMBER_ACCESS_MESSAGE;
    }

    return 'Не удалось добавить пользователя в коллектив: запрос завершился ошибкой.';
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
