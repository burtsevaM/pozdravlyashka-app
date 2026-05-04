import { Injectable } from '@nestjs/common';
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

  constructor(private readonly configService: ConfigService) {
    const user = this.configService.get<string>('EMAIL_USER') ?? '';
    const password = this.configService.get<string>('EMAIL_PASSWORD') ?? '';

    this.transporter = createTransport({
      host: this.configService.get<string>('EMAIL_HOST') ?? 'localhost',
      port: Number(this.configService.get<string>('EMAIL_PORT') ?? 1025),
      secure: this.configService.get<string>('EMAIL_SECURE') === 'true',
      auth: user && password ? { user, pass: password } : undefined,
    });
  }

  async sendMail(message: MailMessage): Promise<void> {
    const mailOptions: SendMailOptions = {
      from:
        this.configService.get<string>('EMAIL_FROM') ??
        'Поздравляшка <no-reply@pozdravlyashka.local>',
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
