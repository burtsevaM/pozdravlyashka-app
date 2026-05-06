import { Component, DestroyRef, effect, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from './core/services/auth.service';
import { NotificationsService } from './core/services/notifications.service';

type NavigationItem = {
  path: string;
  label: string;
  icon: string;
};

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatToolbarModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationsService = inject(NotificationsService);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly isAuthenticated = this.authService.isAuthenticated;
  protected readonly unreadCount = this.notificationsService.unreadCount;

  protected readonly navigationItems: NavigationItem[] = [
    { path: '/dashboard', label: 'Панель', icon: 'dashboard' },
    { path: '/people', label: 'Участники', icon: 'groups' },
    { path: '/events', label: 'Поздравления', icon: 'event' },
    { path: '/import', label: 'Импорт Excel', icon: 'upload_file' },
    { path: '/reminders', label: 'Напоминания', icon: 'notifications' },
    { path: '/settings', label: 'Настройки', icon: 'settings' },
  ];

  constructor() {
    effect(() => {
      if (!this.isAuthenticated()) {
        this.notificationsService.clearUnreadCount();
        return;
      }

      this.notificationsService
        .refreshUnreadCount()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          error: () => this.notificationsService.clearUnreadCount(),
        });
    });
  }

  ngOnInit(): void {
    if (!this.authService.getAccessToken()) {
      return;
    }

    this.authService.getCurrentUser().subscribe({
      error: () => this.authService.logout(),
    });
  }

  protected logout(): void {
    this.notificationsService.clearUnreadCount();
    this.authService.logout();
  }
}
