import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './modules/events/events.module';
import { GiftsModule } from './modules/gifts/gifts.module';
import { HealthModule } from './modules/health/health.module';
import { ImportsModule } from './modules/imports/imports.module';
import { MailModule } from './modules/mail/mail.module';
import { PeopleModule } from './modules/people/people.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { TeamsModule } from './modules/teams/teams.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    TeamsModule,
    PeopleModule,
    EventsModule,
    GiftsModule,
    RemindersModule,
    ImportsModule,
    MailModule,
  ],
})
export class AppModule {}
