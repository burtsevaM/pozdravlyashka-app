import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UserNotificationSettings } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

export type NotificationSettingsResponse = {
  id: string;
  userId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  remind14Days: boolean;
  remind7Days: boolean;
  remind3Days: boolean;
  remind1Day: boolean;
  remindOnDay: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type EmailStatusResponse = {
  mode: 'dev' | 'smtp';
  host: string;
  port: number;
  secure: boolean;
  from: string;
  mailpitUrl: string | null;
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getNotificationSettings(
    userId: string,
  ): Promise<NotificationSettingsResponse> {
    const settings = await this.getOrCreateNotificationSettings(userId);
    return this.toNotificationSettingsResponse(settings);
  }

  async updateNotificationSettings(
    userId: string,
    updateNotificationSettingsDto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettingsResponse> {
    await this.getOrCreateNotificationSettings(userId);

    const settings = await this.prismaService.userNotificationSettings.update({
      where: { userId },
      data: updateNotificationSettingsDto,
    });

    return this.toNotificationSettingsResponse(settings);
  }

  async getOrCreateNotificationSettings(
    userId: string,
  ): Promise<UserNotificationSettings> {
    const settings =
      await this.prismaService.userNotificationSettings.findUnique({
        where: { userId },
      });

    if (settings) {
      return settings;
    }

    return this.prismaService.userNotificationSettings.create({
      data: { userId },
    });
  }

  getEmailStatus(): EmailStatusResponse {
    const mode =
      this.configService.get<string>('EMAIL_MODE') === 'smtp' ? 'smtp' : 'dev';
    const host =
      mode === 'dev'
        ? 'localhost'
        : (this.configService.get<string>('EMAIL_HOST') ?? 'localhost');
    const port =
      mode === 'dev'
        ? 1025
        : Number(this.configService.get<string>('EMAIL_PORT') ?? 1025);
    const secure =
      mode === 'dev'
        ? false
        : this.configService.get<string>('EMAIL_SECURE') === 'true';

    return {
      mode,
      host,
      port,
      secure,
      from:
        this.configService.get<string>('EMAIL_FROM') ??
        'Поздравляшка <no-reply@pozdravlyashka.local>',
      mailpitUrl: mode === 'dev' ? 'http://localhost:8025' : null,
    };
  }

  private toNotificationSettingsResponse(
    settings: UserNotificationSettings,
  ): NotificationSettingsResponse {
    return {
      id: settings.id,
      userId: settings.userId,
      inAppEnabled: settings.inAppEnabled,
      emailEnabled: settings.emailEnabled,
      remind14Days: settings.remind14Days,
      remind7Days: settings.remind7Days,
      remind3Days: settings.remind3Days,
      remind1Day: settings.remind1Day,
      remindOnDay: settings.remindOnDay,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}
