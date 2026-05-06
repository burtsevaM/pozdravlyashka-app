import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CelebrationEvent,
  EventOccasion,
  EventStatus,
  GiftIdea,
  NotificationChannel,
  NotificationStatus,
  Person,
  Prisma,
  Team,
  User,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';

export type RemindersRunResponse = {
  checkedEvents: number;
  createdInAppNotifications: number;
  sentEmails: number;
  failedEmails: number;
  skippedDuplicates: number;
};

type ReminderEvent = CelebrationEvent & {
  person: Person;
  team: Team;
  organizer: User | null;
  deputy: User | null;
  selectedGiftIdea: GiftIdea | null;
};

type ReminderRecipient = {
  user: User;
  messageSuffix?: string;
};

type ReminderOffset = 14 | 7 | 3 | 1 | 0;

const REMINDER_OFFSETS = [14, 7, 3, 1, 0] as const;

@Injectable()
export class RemindersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: SettingsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runDailyEventReminders(): Promise<void> {
    await this.generateEventReminders();
  }

  async generateEventRemindersForUser(
    userId: string,
  ): Promise<RemindersRunResponse> {
    const memberships = await this.prismaService.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });

    return this.generateEventReminders(
      memberships.map((membership) => membership.teamId),
    );
  }

  async generateEventReminders(
    teamIds?: string[],
  ): Promise<RemindersRunResponse> {
    const stats: RemindersRunResponse = {
      checkedEvents: 0,
      createdInAppNotifications: 0,
      sentEmails: 0,
      failedEmails: 0,
      skippedDuplicates: 0,
    };

    if (teamIds && teamIds.length === 0) {
      return stats;
    }

    const today = this.getUtcDateStart(new Date());
    const latestReminderDate = this.addUtcDays(today, 14);
    const events = await this.prismaService.celebrationEvent.findMany({
      where: {
        ...(teamIds ? { teamId: { in: teamIds } } : {}),
        status: {
          in: [EventStatus.PLANNED, EventStatus.IN_PROGRESS],
        },
        date: {
          gte: today,
          lte: latestReminderDate,
        },
      },
      include: {
        person: true,
        team: true,
        organizer: true,
        deputy: true,
        selectedGiftIdea: true,
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    stats.checkedEvents = events.length;

    for (const event of events) {
      const daysUntil = this.getDaysBetween(today, event.date);

      if (!this.isReminderOffset(daysUntil)) {
        continue;
      }

      const recipients = this.getReminderRecipients(event);

      for (const recipient of recipients) {
        const settings =
          await this.settingsService.getOrCreateNotificationSettings(
            recipient.user.id,
          );

        if (!this.isReminderEnabled(daysUntil, settings)) {
          continue;
        }

        if (settings.inAppEnabled) {
          await this.createInAppReminder(event, recipient, daysUntil, stats);
        }

        if (settings.emailEnabled) {
          await this.createEmailReminder(event, recipient, daysUntil, stats);
        }
      }
    }

    return stats;
  }

  private async createInAppReminder(
    event: ReminderEvent,
    recipient: ReminderRecipient,
    daysUntil: number,
    stats: RemindersRunResponse,
  ): Promise<void> {
    const message = this.buildReminderMessage(event, daysUntil, recipient);
    const result =
      await this.notificationsService.createReminderNotificationIfMissing({
        userId: recipient.user.id,
        eventId: event.id,
        type: this.getReminderType(daysUntil),
        title: this.getReminderTitle(event),
        message,
        channel: NotificationChannel.APP,
        status: NotificationStatus.PENDING,
        reminderOffsetDays: daysUntil,
      });

    if (result.created) {
      stats.createdInAppNotifications += 1;
      return;
    }

    stats.skippedDuplicates += 1;
  }

  private async createEmailReminder(
    event: ReminderEvent,
    recipient: ReminderRecipient,
    daysUntil: number,
    stats: RemindersRunResponse,
  ): Promise<void> {
    const message = this.buildReminderMessage(event, daysUntil, recipient);
    const notificationResult =
      await this.notificationsService.createReminderNotificationIfMissing({
        userId: recipient.user.id,
        eventId: event.id,
        type: this.getReminderType(daysUntil),
        title: this.getReminderEmailSubject(event),
        message,
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.PENDING,
        reminderOffsetDays: daysUntil,
      });

    if (!notificationResult.created) {
      stats.skippedDuplicates += 1;
      return;
    }

    if (!recipient.user.email.trim()) {
      await this.notificationsService.updateDeliveryStatus(
        notificationResult.notification.id,
        NotificationStatus.FAILED,
        'У пользователя не указан email',
      );
      stats.failedEmails += 1;
      return;
    }

    try {
      await this.mailService.sendReminderEmail({
        to: recipient.user.email,
        subject: this.getReminderEmailSubject(event),
        text: this.buildReminderEmailText(event, daysUntil),
        html: this.buildReminderEmailHtml(event, daysUntil),
      });

      await this.notificationsService.updateDeliveryStatus(
        notificationResult.notification.id,
        NotificationStatus.SENT,
      );
      stats.sentEmails += 1;
    } catch {
      await this.notificationsService.updateDeliveryStatus(
        notificationResult.notification.id,
        NotificationStatus.FAILED,
        'Не удалось отправить email через настроенный SMTP-сервис',
      );
      stats.failedEmails += 1;
    }
  }

  private getReminderRecipients(event: ReminderEvent): ReminderRecipient[] {
    const organizerIsBirthdayPerson = this.isOrganizerBirthdayPerson(event);

    if (organizerIsBirthdayPerson && event.deputy) {
      return [{ user: event.deputy }];
    }

    if (organizerIsBirthdayPerson && event.organizer) {
      return [
        {
          user: event.organizer,
          messageSuffix:
            'Вы указаны организатором собственного поздравления. Назначьте заместителя, чтобы подготовку вел другой ответственный.',
        },
      ];
    }

    const recipients = [event.organizer, event.deputy].filter(
      (user): user is User => Boolean(user),
    );
    const uniqueRecipients = new Map<string, User>();

    for (const user of recipients) {
      uniqueRecipients.set(user.id, user);
    }

    return [...uniqueRecipients.values()].map((user) => ({ user }));
  }

  private buildReminderMessage(
    event: ReminderEvent,
    daysUntil: number,
    recipient: ReminderRecipient,
  ): string {
    const parts = [
      `${this.getOccasionReminderTitle(event.occasion)}: ${event.person.fullName}.`,
      `Дата: ${this.formatDate(event.date)}.`,
      `До события осталось: ${this.formatDaysUntil(daysUntil)}.`,
      `Статус инициативы: ${this.formatEventStatus(event.status)}.`,
      `Бюджет: ${this.formatMoney(event.budget)}.`,
      `Итоговый подарок: ${event.selectedGiftIdea?.title ?? 'пока не выбран'}.`,
    ];

    if (recipient.messageSuffix) {
      parts.push(recipient.messageSuffix);
    }

    return parts.join(' ');
  }

  private buildReminderEmailText(
    event: ReminderEvent,
    daysUntil: number,
  ): string {
    return [
      'Здравствуйте!',
      '',
      `${this.getOccasionReminderTitle(event.occasion)}: ${event.person.fullName}.`,
      `Дата: ${this.formatDate(event.date)}.`,
      `До события осталось: ${this.formatDaysUntil(daysUntil)}.`,
      `Статус инициативы: ${this.formatEventStatus(event.status)}.`,
      `Бюджет: ${this.formatMoney(event.budget)}.`,
      `Итоговый подарок: ${event.selectedGiftIdea?.title ?? 'Итоговый подарок пока не выбран'}.`,
      '',
      'Перейдите в приложение, чтобы проверить подготовку поздравления.',
    ].join('\n');
  }

  private buildReminderEmailHtml(
    event: ReminderEvent,
    daysUntil: number,
  ): string {
    const finalGift =
      event.selectedGiftIdea?.title ?? 'Итоговый подарок пока не выбран';

    return `
      <div style="font-family: Arial, sans-serif; color: #1d2430; line-height: 1.5; max-width: 640px;">
        <h1 style="font-size: 22px; color: #2f5d50;">Поздравляшка</h1>
        <p>Здравствуйте!</p>
        <p>${this.escapeHtml(this.getOccasionReminderTitle(event.occasion))}: <strong>${this.escapeHtml(event.person.fullName)}</strong>.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tbody>
            ${this.renderEmailRow('Дата', this.formatDate(event.date))}
            ${this.renderEmailRow('До события осталось', this.formatDaysUntil(daysUntil))}
            ${this.renderEmailRow('Статус инициативы', this.formatEventStatus(event.status))}
            ${this.renderEmailRow('Бюджет', this.formatMoney(event.budget))}
            ${this.renderEmailRow('Итоговый подарок', finalGift)}
          </tbody>
        </table>
        <p>Перейдите в приложение, чтобы проверить подготовку поздравления.</p>
      </div>
    `;
  }

  private renderEmailRow(label: string, value: string): string {
    return `
      <tr>
        <td style="padding: 8px 12px; border: 1px solid #dfe4ec; background: #f6f7fb;"><strong>${this.escapeHtml(label)}</strong></td>
        <td style="padding: 8px 12px; border: 1px solid #dfe4ec;">${this.escapeHtml(value)}</td>
      </tr>
    `;
  }

  private getReminderTitle(event: ReminderEvent): string {
    return this.getOccasionReminderTitle(event.occasion);
  }

  private getOccasionReminderTitle(occasion: EventOccasion): string {
    const titles: Record<EventOccasion, string> = {
      [EventOccasion.BIRTHDAY]: 'Скоро день рождения',
      [EventOccasion.ANNIVERSARY]: 'Скоро юбилей',
      [EventOccasion.FAREWELL]: 'Скоро проводы',
      [EventOccasion.PROFESSIONAL_HOLIDAY]:
        'Скоро профессиональный праздник',
      [EventOccasion.CORPORATE]: 'Скоро корпоративное событие',
      [EventOccasion.SUPPORT]: 'Запланирован сбор на поддержку',
      [EventOccasion.OTHER]: 'Скоро событие',
    };

    return titles[occasion];
  }

  private getReminderEmailSubject(event: ReminderEvent): string {
    return `Поздравляшка: скоро поздравление для ${event.person.fullName}`;
  }

  private getReminderType(daysUntil: number): string {
    return daysUntil === 0
      ? 'EVENT_REMINDER_TODAY'
      : `EVENT_REMINDER_${daysUntil}_DAYS`;
  }

  private isReminderOffset(
    daysUntil: number,
  ): daysUntil is (typeof REMINDER_OFFSETS)[number] {
    return REMINDER_OFFSETS.includes(
      daysUntil as (typeof REMINDER_OFFSETS)[number],
    );
  }

  private isReminderEnabled(
    daysUntil: ReminderOffset,
    settings: {
      remind14Days: boolean;
      remind7Days: boolean;
      remind3Days: boolean;
      remind1Day: boolean;
      remindOnDay: boolean;
    },
  ): boolean {
    const enabledByOffset: Record<ReminderOffset, boolean> = {
      14: settings.remind14Days,
      7: settings.remind7Days,
      3: settings.remind3Days,
      1: settings.remind1Day,
      0: settings.remindOnDay,
    };

    return enabledByOffset[daysUntil];
  }

  private isOrganizerBirthdayPerson(event: ReminderEvent): boolean {
    const personEmail = event.person.email?.trim().toLowerCase();
    const organizerEmail = event.organizer?.email.trim().toLowerCase();

    return Boolean(
      personEmail && organizerEmail && personEmail === organizerEmail,
    );
  }

  private formatEventStatus(status: EventStatus): string {
    const labels: Record<EventStatus, string> = {
      PLANNED: 'Запланирована',
      IN_PROGRESS: 'Выбор подарка',
      COMPLETED: 'Завершена',
      CANCELLED: 'Отменена',
    };

    return labels[status];
  }

  private formatMoney(value: Prisma.Decimal | null): string {
    if (value === null) {
      return 'не указан';
    }

    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(Number(value));
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  private formatDaysUntil(daysUntil: number): string {
    if (daysUntil === 0) {
      return 'сегодня';
    }

    const lastTwoDigits = daysUntil % 100;
    const lastDigit = daysUntil % 10;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return `${daysUntil} дней`;
    }

    if (lastDigit === 1) {
      return `${daysUntil} день`;
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
      return `${daysUntil} дня`;
    }

    return `${daysUntil} дней`;
  }

  private getUtcDateStart(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private addUtcDays(date: Date, days: number): Date {
    const nextDate = new Date(date);
    nextDate.setUTCDate(nextDate.getUTCDate() + days);
    return nextDate;
  }

  private getDaysBetween(start: Date, end: Date): number {
    const startDate = this.getUtcDateStart(start);
    const endDate = this.getUtcDateStart(end);
    return Math.round(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    );
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
