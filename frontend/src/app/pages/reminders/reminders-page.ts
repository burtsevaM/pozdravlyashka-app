import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import {
  EVENT_OCCASION_LABELS,
  EventOccasion,
} from '../../core/models/event.models';
import {
  Notification,
  NotificationChannel,
  NotificationFilters,
  NotificationStatus,
  RunRemindersResponse,
} from '../../core/models/notification.models';
import { NotificationsService } from '../../core/services/notifications.service';

type ReminderFilter = 'all' | 'unread' | 'email' | 'app';

type ReminderFilterOption = {
  value: ReminderFilter;
  label: string;
};

@Component({
  selector: 'app-reminders-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './reminders-page.html',
  styleUrl: './reminders-page.scss',
})
export class RemindersPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationsService = inject(NotificationsService);

  protected readonly notifications = signal<Notification[]>([]);
  protected readonly activeFilter = signal<ReminderFilter>('all');
  protected readonly isLoading = signal(false);
  protected readonly isRunning = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly runResult = signal<RunRemindersResponse | null>(null);
  protected readonly unreadCount = this.notificationsService.unreadCount;
  protected readonly hasUnreadNotifications = computed(() =>
    this.notifications().some((notification) => !notification.readAt),
  );

  protected readonly filterOptions: ReminderFilterOption[] = [
    { value: 'all', label: 'Все' },
    { value: 'unread', label: 'Непрочитанные' },
    { value: 'app', label: 'В приложении' },
    { value: 'email', label: 'Email' },
  ];

  ngOnInit(): void {
    this.loadNotifications();
    this.refreshUnreadCount();
  }

  protected setFilter(filter: ReminderFilter): void {
    if (this.activeFilter() === filter) {
      return;
    }

    this.activeFilter.set(filter);
    this.loadNotifications();
  }

  protected loadNotifications(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.notificationsService
      .getNotifications(this.getNotificationFilters())
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (notifications) => this.notifications.set(notifications),
        error: (error: unknown) => {
          this.errorMessage.set(this.getErrorMessage(error, 'загрузить уведомления'));
        },
      });
  }

  protected runReminders(): void {
    this.isRunning.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.runResult.set(null);

    this.notificationsService
      .runReminders()
      .pipe(
        finalize(() => this.isRunning.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.runResult.set(result);
          this.successMessage.set('Напоминания проверены');
          this.loadNotifications();
          this.refreshUnreadCount();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getErrorMessage(error, 'отправить напоминания'));
        },
      });
  }

  protected markAsRead(notification: Notification): void {
    this.errorMessage.set(null);

    this.notificationsService
      .markAsRead(notification.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedNotification) => {
          this.replaceNotification(updatedNotification);
          this.refreshUnreadCount();
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            this.getErrorMessage(error, 'отметить уведомление прочитанным'),
          );
        },
      });
  }

  protected markAllAsRead(): void {
    this.errorMessage.set(null);

    this.notificationsService
      .markAllAsRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ count }) => {
          this.notifications.update((notifications) =>
            notifications.map((notification) => ({
              ...notification,
              readAt: notification.readAt ?? new Date().toISOString(),
            })),
          );
          this.notificationsService.unreadCount.set(count);
          this.successMessage.set('Все уведомления отмечены прочитанными');
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            this.getErrorMessage(error, 'отметить уведомления прочитанными'),
          );
        },
      });
  }

  protected deleteNotification(notification: Notification): void {
    this.errorMessage.set(null);

    this.notificationsService
      .deleteNotification(notification.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.update((notifications) =>
            notifications.filter((item) => item.id !== notification.id),
          );
          this.refreshUnreadCount();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getErrorMessage(error, 'удалить уведомление'));
        },
      });
  }

  protected getChannelLabel(channel: NotificationChannel): string {
    return channel === 'EMAIL' ? 'Email' : 'В приложении';
  }

  protected getStatusLabel(notification: Notification): string {
    if (notification.readAt) {
      return 'Прочитано';
    }

    const labels: Record<Exclude<NotificationStatus, 'READ'>, string> = {
      PENDING: 'Создано',
      SENT: 'Отправлено',
      FAILED: 'Ошибка',
    };

    return labels[notification.status === 'READ' ? 'PENDING' : notification.status];
  }

  protected getCreatedDate(value: string): string {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  protected getEventRelationLines(notification: Notification): string[] {
    if (!notification.eventId) {
      return [];
    }

    if (!notification.eventPersonName && !notification.eventOccasion) {
      return ['Связано с инициативой поздравления'];
    }

    return [
      notification.eventPersonName
        ? `Связано с участником: ${notification.eventPersonName}`
        : 'Связано с инициативой поздравления',
      notification.eventOccasion
        ? `Повод: ${this.getOccasionLabel(notification.eventOccasion)}`
        : '',
    ].filter(Boolean);
  }

  private getNotificationFilters(): NotificationFilters {
    const activeFilter = this.activeFilter();

    if (activeFilter === 'unread') {
      return { unreadOnly: true };
    }

    if (activeFilter === 'email') {
      return { channel: 'EMAIL' };
    }

    if (activeFilter === 'app') {
      return { channel: 'APP' };
    }

    return {};
  }

  private refreshUnreadCount(): void {
    this.notificationsService
      .refreshUnreadCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          this.errorMessage.set('Не удалось загрузить счетчик непрочитанных уведомлений');
        },
      });
  }

  private getOccasionLabel(occasion: string): string {
    return EVENT_OCCASION_LABELS[occasion as EventOccasion] ?? occasion;
  }

  private replaceNotification(updatedNotification: Notification): void {
    this.notifications.update((notifications) =>
      notifications.map((notification) =>
        notification.id === updatedNotification.id ? updatedNotification : notification,
      ),
    );
  }

  private getErrorMessage(error: unknown, action: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return `Не удалось ${action}: frontend не смог отправить запрос.`;
    }

    if (error.status === 0) {
      return 'Сервер недоступен';
    }

    if (error.status === 401) {
      return `Не удалось ${action}: войдите в аккаунт заново.`;
    }

    if (error.status === 403) {
      return `Не удалось ${action}: нет доступа.`;
    }

    if (error.status === 404) {
      return `Не удалось ${action}: уведомление не найдено.`;
    }

    return `Не удалось ${action}`;
  }
}
