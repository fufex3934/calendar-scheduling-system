/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentRepository } from '../appointment/appointment.repository';
import { BusinessLineRepository } from '../business-line/business-line.repository';
import { UserService } from '../users/users.service';
import { MeetingService } from 'src/integrations/meeting.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { MeetingType } from '../../common/enums/meeting-type.enum';
import { EmailService } from '../email/email.service';

@Injectable()
export class BookingService {
  constructor(
    private appointmentRepository: AppointmentRepository,
    private businessLineRepository: BusinessLineRepository,
    private userService: UserService,
    private meetingService: MeetingService,
    private emailService: EmailService,
  ) {}

  async createBooking(slug: string, dto: CreateBookingDto) {
    // 1. Parse and validate dates
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    // 2. Basic date validations
    this.validateDates(startTime, endTime);

    // 3. Get the business line
    const businessLine = await this.businessLineRepository.findBySlug(slug);
    if (!businessLine) {
      throw new NotFoundException(`Business line "${slug}" not found`);
    }

    // 4. Validate working hours
    this.validateWorkingHours(startTime, endTime, businessLine.workingHours);

    // 5. Validate meeting type is allowed
    if (!businessLine.allowedMeetingTypes.includes(dto.meetingType)) {
      throw new ConflictException(
        `${dto.meetingType} is not allowed for ${businessLine.name}. Allowed: ${businessLine.allowedMeetingTypes.join(', ')}`,
      );
    }

    // 6. Get David's user account
    const user = await this.userService.findByEmail('david@company.com');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 7. CRITICAL: Check for conflicts across ALL business lines
    // This uses the fixed conflict detection
    const conflictingAppointments =
      await this.appointmentRepository.findConflictingAppointments(
        user._id,
        startTime,
        endTime,
      );

    if (conflictingAppointments.length > 0) {
      const conflict = conflictingAppointments[0];
      const conflictStart = new Date(conflict.startTime).toLocaleString();
      const conflictEnd = new Date(conflict.endTime).toLocaleString();
      const conflictBusiness =
        (conflict.businessLine as any)?.name || 'Unknown';

      throw new ConflictException(
        `Time slot conflicts with existing ${conflictBusiness} appointment from ${conflictStart} to ${conflictEnd}. Please choose a different time.`,
      );
    }

    // 8. Generate meeting link if needed
    let meetingLink: string | undefined;
    if (dto.meetingType !== MeetingType.PHONE) {
      try {
        const link = await this.meetingService.generateMeetingLink(
          dto.meetingType,
          {
            topic: `${businessLine.name} Consultation`,
            startTime: startTime,
            duration: businessLine.defaultDuration,
            clientEmail: dto.clientEmail,
            clientName: dto.clientName,
          },
        );
        meetingLink = link || undefined;
      } catch (error) {
        // Log error but don't fail booking if meeting link fails
        console.error('Failed to generate meeting link:', error);
        meetingLink = undefined;
      }
    }

    // 9. Create the appointment
    const appointment = await this.appointmentRepository.create({
      clientName: dto.clientName,
      clientEmail: dto.clientEmail,
      startTime: startTime.toISOString(), // ✅ Convert to ISO string
      endTime: endTime.toISOString(), // ✅ Convert to ISO string
      meetingType: dto.meetingType,
      notes: dto.notes,
      user: user._id.toString(),
      businessLine: businessLine._id.toString(),
      meetingLink,
      status: 'confirmed',
    });

    // 10. Send confirmation emails (don't await to avoid blocking response)
    Promise.all([
      this.emailService.sendBookingConfirmation(dto.clientEmail, {
        clientName: dto.clientName,
        businessLine: businessLine.name,
        startTime: startTime,
        endTime: endTime,
        meetingType: dto.meetingType,
        meetingLink,
      }),
      this.emailService.sendBookingConfirmation('admin@company.com', {
        clientName: dto.clientName,
        businessLine: businessLine.name,
        startTime: startTime,
        endTime: endTime,
        meetingType: dto.meetingType,
        meetingLink,
      }),
    ]).catch((error) => {
      console.error('Failed to send email notifications:', error);
    });

    return {
      success: true,
      appointmentId: appointment._id,
      meetingLink: meetingLink,
      businessLine: businessLine.name,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
    };
  }

  /**
   * Validate that dates are valid and in the future
   */
  private validateDates(startTime: Date, endTime: Date): void {
    const now = new Date();
    now.setMilliseconds(0);

    // Check for invalid dates
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new BadRequestException(
        'Invalid date format. Please provide valid ISO date strings.',
      );
    }

    // Check if date is in the past
    if (startTime <= now) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startTime < today) {
        throw new BadRequestException(
          `Cannot book appointments for past dates (${startTime.toLocaleDateString()}). Please select a future date.`,
        );
      } else {
        throw new BadRequestException(
          `Cannot book appointments in the past. Current time: ${now.toLocaleString()}. Requested: ${startTime.toLocaleString()}`,
        );
      }
    }

    // Check if end time is after start time
    if (startTime >= endTime) {
      throw new BadRequestException(
        `End time (${endTime.toLocaleString()}) must be after start time (${startTime.toLocaleString()})`,
      );
    }

    // Optional: Prevent booking too far in advance (e.g., 6 months)
    const maxFutureDate = new Date();
    maxFutureDate.setMonth(maxFutureDate.getMonth() + 6);
    if (startTime > maxFutureDate) {
      throw new BadRequestException(
        `Cannot book appointments more than 6 months in advance. Latest date: ${maxFutureDate.toLocaleDateString()}`,
      );
    }
  }

  /**
   * Validate that meeting is within working hours
   */
  private validateWorkingHours(
    startTime: Date,
    endTime: Date,
    workingHours: number[],
  ): void {
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();
    const startMinute = startTime.getMinutes();
    const endMinute = endTime.getMinutes();

    const [workStart, workEnd] = workingHours;

    // Check if start time is within working hours
    if (startHour < workStart || startHour >= workEnd) {
      throw new BadRequestException(
        `Start time must be between ${workStart}:00 and ${workEnd}:00. Requested: ${startHour}:${startMinute.toString().padStart(2, '0')}`,
      );
    }

    // Check if end time is within working hours
    if (endHour > workEnd || (endHour === workEnd && endMinute > 0)) {
      throw new BadRequestException(
        `End time must be within working hours (before ${workEnd}:00). Requested: ${endHour}:${endMinute.toString().padStart(2, '0')}`,
      );
    }

    // Check duration limits
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
    if (durationMinutes > 240) {
      // Max 4 hours
      throw new BadRequestException(
        `Meeting duration cannot exceed 4 hours. Requested: ${durationMinutes} minutes`,
      );
    }
    if (durationMinutes < 15) {
      throw new BadRequestException(
        `Meeting must be at least 15 minutes. Requested: ${durationMinutes} minutes`,
      );
    }
  }

  async getAvailability(slug: string, date: string) {
    // Validate date parameter
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    const businessLine = await this.businessLineRepository.findBySlug(slug);
    if (!businessLine) {
      throw new NotFoundException(`Business line "${slug}" not found`);
    }

    const user = await this.userService.findByEmail('david@company.com');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const targetDate = new Date(date);

    // Validate date
    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException(
        'Invalid date. Please provide a valid date.',
      );
    }

    // Don't allow checking availability for past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (targetDate < today) {
      throw new BadRequestException('Cannot check availability for past dates');
    }

    // Get all appointments for that day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await this.appointmentRepository.findByUser(
      user._id,
      startOfDay,
      endOfDay,
    );

    // Generate available time slots
    const availableSlots = this.generateTimeSlots(
      businessLine.workingHours[0],
      businessLine.workingHours[1],
      appointments,
      targetDate,
      businessLine.defaultDuration,
    );

    return {
      date,
      availableSlots,
      workingHours: businessLine.workingHours,
      defaultDuration: businessLine.defaultDuration,
    };
  }

  private generateTimeSlots(
    startHour: number,
    endHour: number,
    appointments: any[],
    baseDate: Date,
    defaultDuration: number = 60,
  ) {
    const slots: Array<{ startTime: Date; endTime: Date }> = [];

    // Create date objects for the target day
    const startTime = new Date(baseDate);
    startTime.setHours(startHour, 0, 0, 0);

    const endTime = new Date(baseDate);
    endTime.setHours(endHour, 0, 0, 0);

    // Use 30-minute intervals
    const intervalMinutes = 30;

    while (startTime < endTime) {
      const slotEnd = new Date(startTime);
      slotEnd.setMinutes(startTime.getMinutes() + defaultDuration);

      // Check if slot is within working hours
      if (slotEnd <= endTime) {
        // Check if slot is available (no overlap with existing appointments)
        const isBooked = appointments.some((apt) => {
          const aptStart = new Date(apt.startTime);
          const aptEnd = new Date(apt.endTime);

          // Check for any overlap
          return (
            (startTime >= aptStart && startTime < aptEnd) ||
            (slotEnd > aptStart && slotEnd <= aptEnd) ||
            (startTime <= aptStart && slotEnd >= aptEnd)
          );
        });

        if (!isBooked) {
          slots.push({
            startTime: new Date(startTime),
            endTime: new Date(slotEnd),
          });
        }
      }

      // Move to next interval
      startTime.setMinutes(startTime.getMinutes() + intervalMinutes);
    }

    return slots;
  }
}
