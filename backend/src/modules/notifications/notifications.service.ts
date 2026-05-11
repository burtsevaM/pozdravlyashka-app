import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';

export type NotificationResponse = {
  id: string;
  title: string | null;
  message: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  type: string;
  eventId: string | null;
  reminderOffsetDays: number | null;
  createdAt: Date;
  readAt: Date | null;
  sentAt: Date | null;
  errorMessage: string | null;
  eventPersonName: string | null;
  eventOccasion: string | null;
};

type NotificationWithEvent = Prisma.NotificationGetPayload<{
  include: {
    event: {
      select: {
        occasion: true;
        person: {
          select: {
            fullName: true;
          };
        };
      };
    };
  };
}>;

export type UnreadCountResponse = {
  count: number;
};

export type CreateReminderNotificationInput = {
  userId: string;
  eventId: string;
  type: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  status?: NotificationStatus;
  reminderOffsetDays: number;
  sentAt?: Date | null;
  errorMessage?: string | null;
};

export type CreateActionNotificationInput = {
  userId: string;
  eventId: string;
  type: string;
  title: string;
  message: string;
};

export type CreateNotificationResult = {
  notification: Notification;
  created: boolean;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getNotifications(
    userId: string,
    query: GetNotificationsQueryDto,
  ): Promise<NotificationResponse[]> {
    const notifications = await this.prismaService.notification.findMany({
      where: this.buildUserNotificationWhere(userId, {
        unreadOnly: query.unreadOnly,
        channel: this.normalizeChannel(query.channel),
      }),
      include: {
        event: {
          select: {
            occasion: true,
            person: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: query.limit ?? 50,
    });

    return notifications.map((notification) =>
      this.toNotificationResponse(notification),
    );
  }

  async getUnreadCount(userId: string): Promise<UnreadCountResponse> {
    const count = await this.prismaService.notification.count({
      where: this.buildUserNotificationWhere(userId, { unreadOnly: true }),
    });

    return { count };
  }

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationResponse> {
    const notification = await this.findUserNotificationOrThrow(
      userId,
      notificationId,
    );

    const updatedNotification = await this.prismaService.notification.update({
      where: { id: notification.id },
      data: {
        readAt: notification.readAt ?? new Date(),
      },
      include: {
        event: {
          select: {
            occasion: true,
            person: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    return this.toNotificationResponse(updatedNotification);
  }

  async markAllAsRead(userId: string): Promise<UnreadCountResponse> {
    await this.prismaService.notification.updateMany({
      where: this.buildUserNotificationWhere(userId, { unreadOnly: true }),
      data: {
        readAt: new Date(),
      },
    });

    return this.getUnreadCount(userId);
  }

  async deleteNotification(
    userId: string,
    notificationId: string,
  ): Promise<void> {
    const notification = await this.findUserNotificationOrThrow(
      userId,
      notificationId,
    );

    await this.prismaService.notification.delete({
      where: { id: notification.id },
    });
  }

  async createReminderNotificationIfMissing(
    input: CreateReminderNotificationInput,
  ): Promise<CreateNotificationResult> {
    const existingNotification =
      await this.prismaService.notification.findFirst({
        where: {
          eventId: input.eventId,
          userId: input.userId,
          channel: input.channel,
          type: input.type,
          reminderOffsetDays: input.reminderOffsetDays,
        },
      });

    if (existingNotification) {
      return { notification: existingNotification, created: false };
    }

    const notification = await this.prismaService.notification.create({
      data: {
        eventId: input.eventId,
        userId: input.userId,
        channel: input.channel,
        type: input.type,
        title: input.title,
        message: input.message,
        reminderOffsetDays: input.reminderOffsetDays,
        status: input.status ?? NotificationStatus.PENDING,
        sentAt: input.sentAt ?? null,
        errorMessage: input.errorMessage ?? null,
      },
    });

    return { notification, created: true };
  }

  async createActionNotificationIfMissing(
    input: CreateActionNotificationInput,
  ): Promise<CreateNotificationResult> {
    const existingNotification =
      await this.prismaService.notification.findFirst({
        where: {
          eventId: input.eventId,
          userId: input.userId,
          channel: NotificationChannel.APP,
          type: input.type,
        },
      });

    if (existingNotification) {
      return { notification: existingNotification, created: false };
    }

    const notification = await this.prismaService.notification.create({
      data: {
        eventId: input.eventId,
        userId: input.userId,
        channel: NotificationChannel.APP,
        status: NotificationStatus.PENDING,
        type: input.type,
        title: input.title,
        message: input.message,
      },
    });

    return { notification, created: true };
  }

  async updateDeliveryStatus(
    notificationId: string,
    status: NotificationStatus,
    errorMessage: string | null = null,
  ): Promise<Notification> {
    return this.prismaService.notification.update({
      where: { id: notificationId },
      data: {
        status,
        sentAt: status === NotificationStatus.SENT ? new Date() : null,
        errorMessage,
      },
    });
  }

  private async findUserNotificationOrThrow(
    userId: string,
    notificationId: string,
  ): Promise<Notification> {
    const notification = await this.prismaService.notification.findFirst({
      where: {
        id: notificationId,
        ...this.buildUserNotificationWhere(userId),
      },
    });

    if (!notification) {
      throw new NotFoundException('Уведомление не найдено');
    }

    return notification;
  }

  private buildUserNotificationWhere(
    userId: string,
    filters: {
      unreadOnly?: boolean;
      channel?: NotificationChannel;
    } = {},
  ): Prisma.NotificationWhereInput {
    return {
      userId,
      ...(filters.unreadOnly ? { readAt: null } : {}),
      ...(filters.channel ? { channel: filters.channel } : {}),
      OR: [
        { eventId: null },
        {
          event: {
            team: {
              members: {
                some: {
                  userId,
                },
              },
            },
          },
        },
      ],
    };
  }

  private normalizeChannel(
    channel: GetNotificationsQueryDto['channel'],
  ): NotificationChannel | undefined {
    if (!channel) {
      return undefined;
    }

    return channel === 'IN_APP' ? NotificationChannel.APP : channel;
  }

  private toNotificationResponse(
    notification: Notification | NotificationWithEvent,
  ): NotificationResponse {
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      channel: notification.channel,
      status: notification.status,
      type: notification.type,
      eventId: notification.eventId,
      reminderOffsetDays: notification.reminderOffsetDays,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
      sentAt: notification.sentAt,
      errorMessage: notification.errorMessage,
      eventPersonName: 'event' in notification ? notification.event?.person.fullName ?? null : null,
      eventOccasion: 'event' in notification ? notification.event?.occasion ?? null : null,
    };
  }
}
