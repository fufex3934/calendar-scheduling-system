import { Module } from '@nestjs/common';

import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { AppointmentModule } from '../appointment/appointment.module';
import { BusinessLineModule } from '../business-line/business-line.module';
import { UserModule } from '../users/users.module';
import { MeetingModule } from '../../integrations/meeting.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    AppointmentModule,
    BusinessLineModule,
    UserModule,
    MeetingModule,
    EmailModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
