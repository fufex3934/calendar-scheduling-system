import {
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';
import { MeetingType } from '../../../common/enums/meeting-type.enum';

export class CreateBusinessLineDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  slug: string; // "law-firm", "tax-preparation"

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string; // "Law Firm", "Tax Preparation"

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @IsEnum(MeetingType, { each: true })
  @IsNotEmpty()
  allowedMeetingTypes: MeetingType[];

  @IsInt()
  @Min(15)
  @Max(480) // Max 8 hours
  @IsOptional()
  defaultDuration?: number; // minutes

  @IsArray()
  @IsOptional()
  workingHours?: number[]; // [startHour, endHour]
}
