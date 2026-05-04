import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

type DashboardCard = {
  title: string;
  subtitle: string;
  description: string;
  icon: string;
};

@Component({
  selector: 'app-dashboard-page',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  protected readonly cards: DashboardCard[] = [
    {
      title: 'Ближайшие дни рождения',
      subtitle: 'Календарь событий',
      description: 'Здесь появятся ближайшие даты и ответственные за подготовку поздравлений.',
      icon: 'cake',
    },
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
}
