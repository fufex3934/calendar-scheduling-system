import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MeetingService } from './meeting.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  providers: [MeetingService],
  exports: [MeetingService],
})
export class MeetingModule {}
