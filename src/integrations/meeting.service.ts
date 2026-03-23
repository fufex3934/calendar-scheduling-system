/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MeetingType } from '../common/enums/meeting-type.enum';

export interface MeetingOptions {
  topic: string;
  startTime: Date;
  duration: number;
  clientEmail?: string;
  clientName?: string;
  timezone?: string;
}

export interface ZoomMeetingResponse {
  id: string;
  join_url: string;
  start_url: string;
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

  private zoomAccountId: string;
  private zoomClientId: string;
  private zoomClientSecret: string;
  private zoomAccessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.zoomAccountId =
      this.configService.get<string>('ZOOM_ACCOUNT_ID') || '';
    this.zoomClientId = this.configService.get<string>('ZOOM_API_KEY') || '';
    this.zoomClientSecret =
      this.configService.get<string>('ZOOM_API_SECRET') || '';

    if (!this.zoomAccountId || !this.zoomClientId || !this.zoomClientSecret) {
      this.logger.warn('Zoom credentials are not fully configured.');
    } else {
      this.logger.log('Zoom service initialized with credentials');
    }
  }

  async generateMeetingLink(
    type: MeetingType,
    options: MeetingOptions,
  ): Promise<string | null> {
    try {
      switch (type) {
        case MeetingType.ZOOM:
          return await this.createZoomMeeting(options);
        case MeetingType.GOOGLE_MEET:
          return await this.createGoogleMeet(options);
        case MeetingType.PHONE:
          return null;
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

  // =========================
  // ZOOM
  // =========================

  private async getZoomAccessToken(): Promise<string> {
    if (
      this.zoomAccessToken &&
      this.tokenExpiry &&
      this.tokenExpiry > new Date()
    ) {
      return this.zoomAccessToken!;
    }

    if (!this.zoomAccountId || !this.zoomClientId || !this.zoomClientSecret) {
      throw new UnauthorizedException('Zoom credentials not configured');
    }

    try {
      const credentials = Buffer.from(
        `${this.zoomClientId}:${this.zoomClientSecret}`,
      ).toString('base64');

      const response = await firstValueFrom(
        this.httpService.post(
          'https://zoom.us/oauth/token',
          new URLSearchParams({
            grant_type: 'account_credentials',
            account_id: this.zoomAccountId,
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      this.zoomAccessToken = response.data.access_token;
      this.tokenExpiry = new Date(
        Date.now() + (response.data.expires_in - 30) * 1000,
      );

      return this.zoomAccessToken!;
    } catch (error) {
      this.logger.error(
        'Failed to get Zoom token:',
        error.response?.data || error.message,
      );
      throw new UnauthorizedException('Unable to authenticate with Zoom');
    }
  }

  private async createZoomMeeting(options: MeetingOptions): Promise<string> {
    const accessToken = await this.getZoomAccessToken();

    const response = await firstValueFrom(
      this.httpService.post<ZoomMeetingResponse>(
        'https://api.zoom.us/v2/users/me/meetings',
        {
          topic: options.topic,
          type: 2,
          start_time: options.startTime.toISOString(),
          duration: options.duration,
          timezone: options.timezone || 'UTC',
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      ),
    );

    return response.data.join_url;
  }

  // =========================
  // GOOGLE MEET (FIXED)
  // =========================

  private async getGoogleAccessToken(): Promise<string> {
    const refreshToken = this.configService.get<string>('GOOGLE_REFRESH_TOKEN');
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!refreshToken || !clientId || !clientSecret) {
      throw new Error('Google OAuth2 credentials not configured');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post('https://oauth2.googleapis.com/token', {
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      );

      return response.data.access_token;
    } catch (error) {
      this.logger.error(
        'Failed to get Google access token:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to authenticate with Google');
    }
  }

  private async createGoogleMeet(options: MeetingOptions): Promise<string> {
    const accessToken = await this.getGoogleAccessToken();

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
          requestId: `${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const response = await firstValueFrom(
      this.httpService.post<GoogleMeetResponse>(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1`,
        event,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      ),
    );

    const meetLink = response.data.conferenceData?.entryPoints?.find(
      (e) => e.entryPointType === 'video',
    )?.uri;

    return meetLink || 'https://meet.google.com/';
  }
}