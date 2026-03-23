import {
  IsEmail,
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  IsNotEmpty,
} from 'class-validator';
import { MeetingType } from '../../../common/enums/meeting-type.enum';

// Custom validator for future date
@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDate implements ValidatorConstraintInterface {
  validate(dateString: string, args: ValidationArguments) {
    const date = new Date(dateString);
    const now = new Date();

    // Remove milliseconds for comparison
    now.setMilliseconds(0);
    date.setMilliseconds(0);

    return date > now;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Start time must be in the future';
  }
}

// Custom validator for time range
@ValidatorConstraint({ name: 'isValidTimeRange', async: false })
export class IsValidTimeRange implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    const startTime = new Date(object.startTime);
    const endTime = new Date(object.endTime);

    return startTime < endTime;
  }

  defaultMessage(args: ValidationArguments) {
    return 'End time must be after start time';
  }
}

// Custom validator for working hours
@ValidatorConstraint({ name: 'isWithinWorkingHours', async: false })
export class IsWithinWorkingHours implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    const startTime = new Date(object.startTime);
    const endTime = new Date(object.endTime);
    const workingHours = args.constraints[0] as number[];

    if (!workingHours) return true;

    const startHour = startTime.getHours();
    const endHour = endTime.getHours();

    return startHour >= workingHours[0] && endHour <= workingHours[1];
  }

  defaultMessage(args: ValidationArguments) {
    return `Meeting must be within working hours: ${args.constraints[0][0]}:00 - ${args.constraints[0][1]}:00`;
  }
}

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  clientName: string;

  @IsEmail()
  @IsNotEmpty()
  clientEmail: string;

  @IsDateString()
  @IsNotEmpty()
  @Validate(IsFutureDate)
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  @Validate(IsValidTimeRange)
  endTime: string;

  @IsEnum(MeetingType)
  @IsNotEmpty()
  meetingType: MeetingType;

  @IsOptional()
  @IsString()
  notes?: string;
}
