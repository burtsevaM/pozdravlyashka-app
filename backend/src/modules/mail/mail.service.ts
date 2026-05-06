import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, SendMailOptions, Transporter } from 'nodemailer';

type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const emailMode = this.configService.get<string>('EMAIL_MODE') ?? 'dev';
    const user = this.configService.get<string>('EMAIL_USER') ?? '';
    const password = this.configService.get<string>('EMAIL_PASSWORD') ?? '';
    const host =
      emailMode === 'dev'
        ? 'localhost'
        : (this.configService.get<string>('EMAIL_HOST') ?? 'localhost');
    const port =
      emailMode === 'dev'
        ? 1025
        : Number(this.configService.get<string>('EMAIL_PORT') ?? 1025);
    const secure =
      emailMode === 'dev'
        ? false
        : this.configService.get<string>('EMAIL_SECURE') === 'true';

    this.from =
      this.configService.get<string>('EMAIL_FROM') ??
      'Поздравляшка <no-reply@pozdravlyashka.local>';

    this.transporter = createTransport({
      host,
      port,
      secure,
      auth:
        emailMode === 'smtp' && user && password
          ? { user, pass: password }
          : undefined,
    });
  }

  async sendMail(message: MailMessage): Promise<unknown> {
    const mailOptions: SendMailOptions = {
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    };

    try {
      return await this.transporter.sendMail(mailOptions);
    } catch {
      throw new ServiceUnavailableException(
        'Не удалось отправить email через настроенный SMTP-сервис',
      );
    }
  }

  async sendReminderEmail(message: MailMessage): Promise<unknown> {
    return this.sendMail(message);
  }
}
