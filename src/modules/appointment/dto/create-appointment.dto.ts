import {
  IsString,
  IsEmail,
  IsDateString,
  IsEnum,
  IsOptional,
  IsMongoId,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { MeetingType } from '../../../common/enums/meeting-type.enum';

export class CreateAppointmentDto {
  @IsMongoId()
  @IsOptional()
  businessLine?: string; // Optional because it might come from URL param

  @IsMongoId()
  @IsOptional()
  user?: string; // Optional because we'll fetch the user (David)

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  clientName: string;

  @IsEmail()
  @IsNotEmpty()
  clientEmail: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsEnum(MeetingType)
  @IsNotEmpty()
  meetingType: MeetingType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsString()
  status?: string; // Will default to 'confirmed' in schema
}
