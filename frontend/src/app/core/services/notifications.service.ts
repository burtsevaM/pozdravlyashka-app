import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Notification,
  NotificationFilters,
  RunRemindersResponse,
  UnreadCountResponse,
} from '../models/notification.models';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly httpClient = inject(HttpClient);
  private readonly notificationsUrl = `${environment.apiUrl}/notifications`;

  readonly unreadCount = signal(0);

  getNotifications(filters: NotificationFilters = {}) {
    let params = new HttpParams();

    if (filters.unreadOnly !== undefined) {
      params = params.set('unreadOnly', String(filters.unreadOnly));
    }

    if (filters.limit !== undefined) {
      params = params.set('limit', String(filters.limit));
    }

    if (filters.channel) {
      params = params.set('channel', filters.channel === 'IN_APP' ? 'APP' : filters.channel);
    }

    return this.httpClient.get<Notification[]>(this.notificationsUrl, { params });
  }

  getUnreadCount() {
    return this.httpClient.get<UnreadCountResponse>(`${this.notificationsUrl}/unread-count`);
  }

  refreshUnreadCount() {
    return this.getUnreadCount().pipe(tap(({ count }) => this.unreadCount.set(count)));
  }

  clearUnreadCount(): void {
    this.unreadCount.set(0);
  }

  markAsRead(notificationId: string) {
    return this.httpClient.patch<Notification>(
      `${this.notificationsUrl}/${notificationId}/read`,
      {},
    );
  }

  markAllAsRead() {
    return this.httpClient.patch<UnreadCountResponse>(`${this.notificationsUrl}/read-all`, {});
  }

  deleteNotification(notificationId: string) {
    return this.httpClient.delete<void>(`${this.notificationsUrl}/${notificationId}`);
  }

  runReminders() {
    return this.httpClient.post<RunRemindersResponse>(`${environment.apiUrl}/reminders/run`, {});
  }
}
