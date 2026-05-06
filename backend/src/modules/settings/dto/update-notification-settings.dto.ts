import { IsBoolean } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsBoolean()
  inAppEnabled!: boolean;

  @IsBoolean()
  emailEnabled!: boolean;

  @IsBoolean()
  remind14Days!: boolean;

  @IsBoolean()
  remind7Days!: boolean;

  @IsBoolean()
  remind3Days!: boolean;

  @IsBoolean()
  remind1Day!: boolean;

  @IsBoolean()
  remindOnDay!: boolean;
}
