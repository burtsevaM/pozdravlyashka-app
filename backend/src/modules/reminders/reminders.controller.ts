import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { RemindersRunResponse, RemindersService } from './reminders.service';

type AuthenticatedRequest = Request & {
  user: AuthUser;
};

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post('run')
  runReminders(
    @Req() request: AuthenticatedRequest,
  ): Promise<RemindersRunResponse> {
    return this.remindersService.generateEventRemindersForUser(request.user.id);
  }
}
