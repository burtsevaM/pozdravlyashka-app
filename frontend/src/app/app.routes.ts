import { Routes } from '@angular/router';
import { DashboardPage } from './pages/dashboard/dashboard-page';
import { SimplePage } from './pages/simple-page/simple-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardPage },
  {
    path: 'people',
    component: SimplePage,
    data: {
      title: 'Участники',
      description: 'База людей, дат рождения, отделов и полезных заметок для будущих поздравлений.',
    },
  },
  {
    path: 'events',
    component: SimplePage,
    data: {
      title: 'Поздравления',
      description: 'Планирование событий, бюджета, организаторов и статусов подготовки.',
    },
  },
  {
    path: 'import',
    component: SimplePage,
    data: {
      title: 'Импорт Excel',
      description: 'Загрузка списка участников и истории подарков из таблицы Excel.',
    },
  },
  {
    path: 'reminders',
    component: SimplePage,
    data: {
      title: 'Напоминания',
      description: 'Контроль ближайших дат и уведомлений внутри приложения и по email.',
    },
  },
  {
    path: 'settings',
    component: SimplePage,
    data: {
      title: 'Настройки',
      description: 'Параметры команды, доступа, SMTP и базовых правил поздравлений.',
    },
  },
  { path: '**', redirectTo: 'dashboard' },
];
