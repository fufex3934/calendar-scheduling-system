import {
  IsEmail,
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { MeetingType } from '../../../common/enums/meeting-type.enum';

export class CreateBookingDto {
  @IsString()
  clientName: string;

  @IsEmail()
  clientEmail: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsEnum(MeetingType)
  meetingType: MeetingType;

  @IsOptional()
  @IsString()
  notes?: string;
}
