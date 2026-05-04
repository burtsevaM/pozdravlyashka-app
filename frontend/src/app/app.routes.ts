import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { DashboardPage } from './pages/dashboard/dashboard-page';
import { SimplePage } from './pages/simple-page/simple-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login-page/login-page').then((module) => module.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/auth/register-page/register-page').then((module) => module.RegisterPage),
  },
  { path: 'dashboard', component: DashboardPage, canActivate: [authGuard] },
  {
    path: 'people',
    component: SimplePage,
    canActivate: [authGuard],
    data: {
      title: 'Участники',
      description: 'База людей, дат рождения, отделов и полезных заметок для будущих поздравлений.',
    },
  },
  {
    path: 'events',
    component: SimplePage,
    canActivate: [authGuard],
    data: {
      title: 'Поздравления',
      description: 'Планирование событий, бюджета, организаторов и статусов подготовки.',
    },
  },
  {
    path: 'import',
    component: SimplePage,
    canActivate: [authGuard],
    data: {
      title: 'Импорт Excel',
      description: 'Загрузка списка участников и истории подарков из таблицы Excel.',
    },
  },
  {
    path: 'reminders',
    component: SimplePage,
    canActivate: [authGuard],
    data: {
      title: 'Напоминания',
      description: 'Контроль ближайших дат и уведомлений внутри приложения и по email.',
    },
  },
  {
    path: 'settings',
    component: SimplePage,
    canActivate: [authGuard],
    data: {
      title: 'Настройки',
      description: 'Параметры команды, доступа, SMTP и базовых правил поздравлений.',
    },
  },
  { path: '**', redirectTo: 'dashboard' },
];
