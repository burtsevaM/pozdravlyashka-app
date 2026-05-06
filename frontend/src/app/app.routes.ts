import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { DashboardPage } from './pages/dashboard/dashboard-page';
import { EventsPage } from './pages/events/events-page';
import { ImportPage } from './pages/import/import-page';
import { PersonDetailPage } from './pages/people/person-detail-page';
import { PeoplePage } from './pages/people/people-page';
import { RemindersPage } from './pages/reminders/reminders-page';

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
    component: PeoplePage,
    canActivate: [authGuard],
  },
  {
    path: 'people/:personId',
    component: PersonDetailPage,
    canActivate: [authGuard],
  },
  {
    path: 'events',
    component: EventsPage,
    canActivate: [authGuard],
  },
  {
    path: 'import',
    component: ImportPage,
    canActivate: [authGuard],
  },
  {
    path: 'reminders',
    component: RemindersPage,
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings/settings-page').then((module) => module.SettingsPage),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'dashboard' },
];
