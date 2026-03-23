/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// modules/email/email.module.ts
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { join } from 'path';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('EMAIL_HOST'),
          port: configService.get('EMAIL_PORT'),
          secure: false, // Set to true if using port 465
          auth: {
            user: configService.get('EMAIL_USER'),
            pass: configService.get('EMAIL_PASSWORD'),
          },
        },
        defaults: {
          from: `"David's Office" <${configService.get('EMAIL_FROM')}>`,
        },
        template: {
          dir: join(__dirname, 'templates'),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
