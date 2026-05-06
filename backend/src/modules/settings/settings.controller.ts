import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { SettingsService } from './settings.service';
import type {
  EmailStatusResponse,
  NotificationSettingsResponse,
} from './settings.service';

type AuthenticatedRequest = Request & {
  user: AuthUser;
};

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('notifications')
  getNotificationSettings(
    @Req() request: AuthenticatedRequest,
  ): Promise<NotificationSettingsResponse> {
    return this.settingsService.getNotificationSettings(request.user.id);
  }

  @Patch('notifications')
  updateNotificationSettings(
    @Req() request: AuthenticatedRequest,
    @Body() updateNotificationSettingsDto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettingsResponse> {
    return this.settingsService.updateNotificationSettings(
      request.user.id,
      updateNotificationSettingsDto,
    );
  }

  @Get('email-status')
  getEmailStatus(): EmailStatusResponse {
    return this.settingsService.getEmailStatus();
  }
}
