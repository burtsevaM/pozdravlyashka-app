import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './modules/events/events.module';
import { GiftsModule } from './modules/gifts/gifts.module';
import { HealthModule } from './modules/health/health.module';
import { ImportsModule } from './modules/imports/imports.module';
import { MailModule } from './modules/mail/mail.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PeopleModule } from './modules/people/people.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TeamsModule } from './modules/teams/teams.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    TeamsModule,
    PeopleModule,
    EventsModule,
    GiftsModule,
    NotificationsModule,
    RemindersModule,
    SettingsModule,
    ImportsModule,
    MailModule,
  ],
})
export class AppModule {}
