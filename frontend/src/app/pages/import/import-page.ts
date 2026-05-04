import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { finalize } from 'rxjs';
import {
  CommitImportResponse,
  ImportPreviewResponse,
  ImportPreviewRow,
} from '../../core/models/import.models';
import { ImportsService } from '../../core/services/imports.service';
import { TeamContextService } from '../../core/services/team-context.service';

type ApiErrorResponse = {
  message?: string | string[];
};

@Component({
  selector: 'app-import-page',
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule],
  templateUrl: './import-page.html',
  styleUrl: './import-page.scss',
})
export class ImportPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly importsService = inject(ImportsService);
  protected readonly teamContext = inject(TeamContextService);

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly preview = signal<ImportPreviewResponse | null>(null);
  protected readonly commitResult = signal<CommitImportResponse | null>(null);
  protected readonly isPreviewLoading = signal(false);
  protected readonly isCommitLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.teamContext
      .loadTeams()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => this.errorMessage.set('Не удалось загрузить коллективы'),
      });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.selectedFile.set(file);
    this.preview.set(null);
    this.commitResult.set(null);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.errorMessage.set('Поддерживаются только файлы .xlsx');
    }
  }

  protected previewFile(): void {
    const activeTeamId = this.teamContext.activeTeamId();
    const file = this.selectedFile();

    if (!activeTeamId) {
      this.errorMessage.set('Сначала создайте или выберите коллектив на главной панели.');
      return;
    }

    if (!file) {
      this.errorMessage.set('Выберите файл .xlsx для проверки.');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.errorMessage.set('Поддерживаются только файлы .xlsx');
      return;
    }

    this.isPreviewLoading.set(true);
    this.preview.set(null);
    this.commitResult.set(null);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.importsService
      .previewPeopleImport(activeTeamId, file)
      .pipe(
        finalize(() => this.isPreviewLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (preview) => {
          this.preview.set(preview);
          this.successMessage.set('Файл проверен. Посмотрите строки перед сохранением.');
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getRequestErrorMessage(error, 'проверить файл'));
        },
      });
  }

  protected commitValidRows(): void {
    const activeTeamId = this.teamContext.activeTeamId();
    const preview = this.preview();

    if (!activeTeamId || !preview) {
      return;
    }

    if (preview.validRows === 0) {
      this.errorMessage.set('В файле нет валидных строк для сохранения.');
      return;
    }

    this.isCommitLoading.set(true);
    this.commitResult.set(null);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.importsService
      .commitPeopleImport(activeTeamId, preview.rows)
      .pipe(
        finalize(() => this.isCommitLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.commitResult.set(result);
          this.successMessage.set('Валидные строки сохранены.');
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getRequestErrorMessage(error, 'сохранить строки'));
        },
      });
  }

  protected getRowStatus(row: ImportPreviewRow): string {
    return row.valid ? 'Готово к сохранению' : 'Есть ошибки';
  }

  protected formatGiftHistory(row: ImportPreviewRow): string {
    const giftHistory = row.giftHistory;

    if (!giftHistory?.giftName) {
      return 'Не указан';
    }

    return giftHistory.year
      ? `${giftHistory.giftName}, ${giftHistory.year}`
      : giftHistory.giftName;
  }

  protected hasValidRows(preview: ImportPreviewResponse | null): boolean {
    return Boolean(preview && preview.validRows > 0);
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
      return `Не удалось ${action}: нет доступа к выбранному коллективу.`;
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
