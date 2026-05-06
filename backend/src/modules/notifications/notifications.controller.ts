import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import {
  NotificationResponse,
  NotificationsService,
  UnreadCountResponse,
} from './notifications.service';

type AuthenticatedRequest = Request & {
  user: AuthUser;
};

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotifications(
    @Req() request: AuthenticatedRequest,
    @Query() query: GetNotificationsQueryDto,
  ): Promise<NotificationResponse[]> {
    return this.notificationsService.getNotifications(request.user.id, query);
  }

  @Get('unread-count')
  getUnreadCount(
    @Req() request: AuthenticatedRequest,
  ): Promise<UnreadCountResponse> {
    return this.notificationsService.getUnreadCount(request.user.id);
  }

  @Patch('read-all')
  markAllAsRead(
    @Req() request: AuthenticatedRequest,
  ): Promise<UnreadCountResponse> {
    return this.notificationsService.markAllAsRead(request.user.id);
  }

  @Patch(':notificationId/read')
  markAsRead(
    @Req() request: AuthenticatedRequest,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ): Promise<NotificationResponse> {
    return this.notificationsService.markAsRead(
      request.user.id,
      notificationId,
    );
  }

  @Delete(':notificationId')
  @HttpCode(204)
  deleteNotification(
    @Req() request: AuthenticatedRequest,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ): Promise<void> {
    return this.notificationsService.deleteNotification(
      request.user.id,
      notificationId,
    );
  }
}
