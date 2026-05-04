import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from './core/services/auth.service';

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

  protected readonly currentUser = this.authService.currentUser;
  protected readonly isAuthenticated = this.authService.isAuthenticated;

  protected readonly navigationItems: NavigationItem[] = [
    { path: '/dashboard', label: 'Панель', icon: 'dashboard' },
    { path: '/people', label: 'Участники', icon: 'groups' },
    { path: '/events', label: 'Поздравления', icon: 'event' },
    { path: '/import', label: 'Импорт Excel', icon: 'upload_file' },
    { path: '/reminders', label: 'Напоминания', icon: 'notifications' },
    { path: '/settings', label: 'Настройки', icon: 'settings' },
  ];

  ngOnInit(): void {
    if (!this.authService.getAccessToken()) {
      return;
    }

    this.authService.getCurrentUser().subscribe({
      error: () => this.authService.logout(),
    });
  }

  protected logout(): void {
    this.authService.logout();
  }
}
