import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { BookingModule } from '../booking/booking.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [BookingModule, EmailModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
