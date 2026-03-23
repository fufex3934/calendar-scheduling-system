/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MeetingType } from '../common/enums/meeting-type.enum';

export interface MeetingOptions {
  topic: string;
  startTime: Date;
  duration: number; // in minutes
  clientEmail?: string;
  clientName?: string;
  timezone?: string;
}

export interface ZoomMeetingResponse {
  id: string;
  join_url: string;
  start_url: string;
  topic: string;
  start_time: string;
  duration: number;
}

export interface GoogleMeetResponse {
  id: string;
  htmlLink: string;
  conferenceData: {
    entryPoints: Array<{
      entryPointType: string;
      uri: string;
    }>;
  };
}

@Injectable()
export class MeetingService {
  private readonly logger = new Logger(MeetingService.name);
  private zoomApiKey: string;
  private zoomApiSecret: string;
  private googleApiKey: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.zoomApiKey = this.configService.get<string>('zoom.apiKey') || '';
    this.zoomApiSecret = this.configService.get<string>('zoom.apiSecret') || '';
    this.googleApiKey = this.configService.get<string>('google.apiKey') || '';
  }

  /**
   * Generate meeting link based on type
   */
  async generateMeetingLink(
    type: MeetingType,
    options: MeetingOptions,
  ): Promise<string | null> {
    try {
      switch (type) {
        case MeetingType.ZOOM:
          return this.createZoomMeeting(options);
        case MeetingType.GOOGLE_MEET:
          return this.createGoogleMeet(options);
        case MeetingType.PHONE:
          return null; // No link needed for phone
        default:
          throw new BadRequestException(`Unsupported meeting type: ${type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to generate ${type} meeting link:`, error);
      throw new BadRequestException(
        `Failed to create meeting: ${error.message}`,
      );
    }
  }

  /**
   * Create Zoom meeting
   */
  private async createZoomMeeting(options: MeetingOptions): Promise<string> {
    try {
      // Format start time for Zoom API
      const startTime = options.startTime.toISOString();

      // Zoom API endpoint for creating meetings
      const zoomUrl = 'https://api.zoom.us/v2/users/me/meetings';

      // Get Zoom access token (you'll need to implement OAuth flow)
      const accessToken = await this.getZoomAccessToken();

      const meetingData = {
        topic: options.topic,
        type: 2, // Scheduled meeting
        start_time: startTime,
        duration: options.duration,
        timezone: options.timezone || 'UTC',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: true,
          auto_recording: 'none',
        },
      };

      const response = await firstValueFrom(
        this.httpService.post<ZoomMeetingResponse>(zoomUrl, meetingData, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`Zoom meeting created: ${response.data.join_url}`);
      return response.data.join_url;
    } catch (error) {
      this.logger.error(
        'Zoom meeting creation failed:',
        error.response?.data || error.message,
      );
      throw new Error(`Zoom API error: ${error.message}`);
    }
  }

  /**
   * Create Google Meet link
   */
  private async createGoogleMeet(options: MeetingOptions): Promise<string> {
    try {
      // This is a simplified version. In production, you'd use Google Calendar API
      // with proper OAuth2 authentication for the user's calendar

      const calendarId = 'primary'; // Or use David's calendar ID
      const event = {
        summary: options.topic,
        description: `Meeting with ${options.clientName || 'client'}`,
        start: {
          dateTime: options.startTime.toISOString(),
          timeZone: options.timezone || 'UTC',
        },
        end: {
          dateTime: new Date(
            options.startTime.getTime() + options.duration * 60000,
          ).toISOString(),
          timeZone: options.timezone || 'UTC',
        },
        attendees: options.clientEmail ? [{ email: options.clientEmail }] : [],
        conferenceData: {
          createRequest: {
            requestId: `${Date.now()}-${Math.random()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      };

      // Google Calendar API endpoint
      const googleUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1`;

      const response = await firstValueFrom(
        this.httpService.post<GoogleMeetResponse>(googleUrl, event, {
          headers: {
            Authorization: `Bearer ${this.getGoogleAccessToken()}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      // Extract Meet link from conference data
      const meetLink = response.data.conferenceData?.entryPoints?.find(
        (entry: any) => entry.entryPointType === 'video',
      )?.uri;

      this.logger.log(`Google Meet created: ${meetLink}`);
      return meetLink || 'https://meet.google.com/';
    } catch (error) {
      this.logger.error(
        'Google Meet creation failed:',
        error.response?.data || error.message,
      );
      throw new Error(`Google Calendar API error: ${error.message}`);
    }
  }

  /**
   * Get Zoom access token (simplified - implement proper OAuth)
   */
  private async getZoomAccessToken(): Promise<string> {
    // In production, you would:
    // 1. Store refresh token
    // 2. Get new access token using refresh token
    // 3. Handle token expiration

    try {
      const auth = Buffer.from(
        `${this.zoomApiKey}:${this.zoomApiSecret}`,
      ).toString('base64');

      const response = await firstValueFrom(
        this.httpService.post(
          'https://zoom.us/oauth/token',
          new URLSearchParams({
            grant_type: 'account_credentials',
            account_id: 'YOUR_ACCOUNT_ID',
          }),
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      return response.data.access_token;
    } catch (error) {
      this.logger.error('Failed to get Zoom token:', error.message);
      // Return mock token for development
      return 'mock_zoom_token';
    }
  }

  /**
   * Get Google access token (simplified - implement proper OAuth)
   */
  private getGoogleAccessToken(): string {
    // In production, implement OAuth2 flow
    // For now, return mock token
    return this.googleApiKey || 'mock_google_token';
  }

  /**
   * Send meeting invitation email (placeholder)
   */
  sendMeetingInvitation(
    meetingType: MeetingType,
    meetingLink: string | null,
    clientEmail: string,
    clientName: string,
    startTime: Date,
    duration: number,
  ): void {
    // This would integrate with your email service (SendGrid, Nodemailer, etc.)
    this.logger.log(
      `Sending invitation to ${clientEmail} for ${meetingType} meeting at ${startTime}`,
    );

    // Example email content
    const emailContent = `
      Dear ${clientName},
      
      Your ${meetingType} meeting has been scheduled for ${startTime.toLocaleString()}.
      Duration: ${duration} minutes.
      
      ${meetingLink ? `Join here: ${meetingLink}` : 'You will receive a phone call at the scheduled time.'}
      
      Best regards,
      David's Office
    `;

    // Implement actual email sending logic here
    console.log('Email content:', emailContent);
  }

  /**
   * Update meeting (reschedule)
   */
  async updateMeeting(
    meetingType: MeetingType,
    meetingId: string,
    newStartTime: Date,
    newDuration: number,
  ): Promise<string | null> {
    try {
      switch (meetingType) {
        case MeetingType.ZOOM:
          return this.updateZoomMeeting(meetingId, newStartTime, newDuration);
        case MeetingType.GOOGLE_MEET:
          return this.updateGoogleMeet(meetingId, newStartTime, newDuration);
        default:
          return null;
      }
    } catch (error) {
      this.logger.error(`Failed to update ${meetingType} meeting:`, error);
      throw error;
    }
  }

  /**
   * Update Zoom meeting
   */
  private async updateZoomMeeting(
    meetingId: string,
    newStartTime: Date,
    newDuration: number,
  ): Promise<string> {
    const accessToken = await this.getZoomAccessToken();
    const zoomUrl = `https://api.zoom.us/v2/meetings/${meetingId}`;

    const updateData = {
      start_time: newStartTime.toISOString(),
      duration: newDuration,
    };

    await firstValueFrom(
      this.httpService.patch(zoomUrl, updateData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }),
    );

    return `Updated Zoom meeting: ${meetingId}`;
  }

  /**
   * Update Google Meet
   */
  private async updateGoogleMeet(
    eventId: string,
    newStartTime: Date,
    newDuration: number,
  ): Promise<string> {
    const calendarId = 'primary';
    const googleUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`;

    const updateData = {
      start: {
        dateTime: newStartTime.toISOString(),
      },
      end: {
        dateTime: new Date(
          newStartTime.getTime() + newDuration * 60000,
        ).toISOString(),
      },
    };

    await firstValueFrom(
      this.httpService.patch(googleUrl, updateData, {
        headers: {
          Authorization: `Bearer ${this.getGoogleAccessToken()}`,
          'Content-Type': 'application/json',
        },
      }),
    );

    return `Updated Google Meet: ${eventId}`;
  }

  /**
   * Cancel meeting
   */
  async cancelMeeting(
    meetingType: MeetingType,
    meetingId: string,
  ): Promise<void> {
    try {
      switch (meetingType) {
        case MeetingType.ZOOM:
          await this.cancelZoomMeeting(meetingId);
          break;
        case MeetingType.GOOGLE_MEET:
          await this.cancelGoogleMeet(meetingId);
          break;
        default:
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to cancel ${meetingType} meeting:`, error);
      throw error;
    }
  }

  /**
   * Cancel Zoom meeting
   */
  private async cancelZoomMeeting(meetingId: string): Promise<void> {
    const accessToken = await this.getZoomAccessToken();
    const zoomUrl = `https://api.zoom.us/v2/meetings/${meetingId}`;

    await firstValueFrom(
      this.httpService.delete(zoomUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    );

    this.logger.log(`Zoom meeting ${meetingId} cancelled`);
  }

  /**
   * Cancel Google Meet
   */
  private async cancelGoogleMeet(eventId: string): Promise<void> {
    const calendarId = 'primary';
    const googleUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`;

    await firstValueFrom(
      this.httpService.delete(googleUrl, {
        headers: {
          Authorization: `Bearer ${this.getGoogleAccessToken()}`,
        },
      }),
    );

    this.logger.log(`Google Meet ${eventId} cancelled`);
  }
}
