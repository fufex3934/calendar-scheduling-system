import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  async sendBookingConfirmation(
    to: string,
    data: {
      clientName: string;
      businessLine: string;
      startTime: Date;
      endTime: Date;
      meetingType: string;
      meetingLink?: string;
    },
  ) {
    await this.mailerService.sendMail({
      to,
      subject: `Booking Confirmation: ${data.businessLine} Consultation`,
      template: './booking-confirmation',
      context: {
        ...data,
        startTimeFormatted: this.formatDateTime(data.startTime),
        endTimeFormatted: this.formatDateTime(data.endTime),
        meetingInstructions: this.getMeetingInstructions(
          data.meetingType,
          data.meetingLink,
        ),
      },
    });
  }

  async sendBookingReminder(
    to: string,
    data: {
      clientName: string;
      businessLine: string;
      startTime: Date;
      meetingType: string;
      meetingLink?: string;
    },
  ) {
    await this.mailerService.sendMail({
      to,
      subject: `Reminder: ${data.businessLine} Consultation Tomorrow`,
      template: './booking-reminder',
      context: {
        ...data,
        startTimeFormatted: this.formatDateTime(data.startTime),
        meetingInstructions: this.getMeetingInstructions(
          data.meetingType,
          data.meetingLink,
        ),
      },
    });
  }

  async sendCancellationNotice(
    to: string,
    data: {
      clientName: string;
      businessLine: string;
      startTime: Date;
    },
  ) {
    await this.mailerService.sendMail({
      to,
      subject: `Booking Cancelled: ${data.businessLine} Consultation`,
      template: './cancellation-notice',
      context: {
        ...data,
        startTimeFormatted: this.formatDateTime(data.startTime),
      },
    });
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }

  private getMeetingInstructions(
    meetingType: string,
    meetingLink?: string,
  ): string {
    switch (meetingType) {
      case 'zoom':
      case 'google_meet':
        return `Join via: ${meetingLink}`;
      case 'phone':
        return 'You will receive a phone call at the scheduled time. Please ensure your phone is available.';
      default:
        return 'Meeting details will be provided separately.';
    }
  }
}
