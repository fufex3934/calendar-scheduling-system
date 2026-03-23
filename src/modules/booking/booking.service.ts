/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentRepository } from '../appointment/appointment.repository';
import { BusinessLineRepository } from '../business-line/business-line.repository';
import { UserService } from '../users/users.service';
import { MeetingService } from 'src/integrations/meeting.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { MeetingType } from '../../common/enums/meeting-type.enum';

@Injectable()
export class BookingService {
  constructor(
    private appointmentRepository: AppointmentRepository,
    private businessLineRepository: BusinessLineRepository,
    private userService: UserService,
    private meetingService: MeetingService,
  ) {}

  async createBooking(slug: string, dto: CreateBookingDto) {
    // 1. Get the business line
    const businessLine = await this.businessLineRepository.findBySlug(slug);
    if (!businessLine) {
      throw new NotFoundException(`Business line "${slug}" not found`);
    }

    // 2. Validate meeting type is allowed for this business line

    if (!businessLine.allowedMeetingTypes.includes(dto.meetingType)) {
      throw new ConflictException(
        `${dto.meetingType} is not allowed for ${businessLine.name}. Allowed: ${businessLine.allowedMeetingTypes.join(', ')}`,
      );
    }

    // 3. Get David's user account
    const user = await this.userService.findByEmail('david@company.com');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 4. CRITICAL: Check for conflicts across ALL business lines
    const conflictingAppointments =
      await this.appointmentRepository.findConflictingAppointments(
        user._id,
        new Date(dto.startTime),
        new Date(dto.endTime),
      );

    if (conflictingAppointments.length > 0) {
      const conflict = conflictingAppointments[0];
      throw new ConflictException(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Time slot conflicts with existing ${conflict.businessLine['name']} appointment from ${conflict.startTime} to ${conflict.endTime}`,
      );
    }

    // 5. Generate meeting link if needed
    let meetingLink: string | undefined;
    if (dto.meetingType !== MeetingType.PHONE) {
      const link = await this.meetingService.generateMeetingLink(
        dto.meetingType,
        {
          topic: `${businessLine.name} Consultation`,
          startTime: new Date(dto.startTime),
          duration: businessLine.defaultDuration,
          clientEmail: dto.clientEmail,
        },
      );
      meetingLink = link || undefined;
    }

    // 6. Create the appointment
    const appointment = await this.appointmentRepository.create({
      ...dto,
      user: user._id.toString(),
      businessLine: businessLine._id.toString(),
      meetingLink,
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

  async getAvailability(slug: string, date: string) {
    const businessLine = await this.businessLineRepository.findBySlug(slug);
    if (!businessLine) {
      throw new NotFoundException(`Business line "${slug}" not found`);
    }

    const user = await this.userService.findByEmail('david@company.com');
    const targetDate = new Date(date);

    // Get all appointments for that day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    if (!user) {
      throw new NotFoundException('User not found');
    }
    const appointments = await this.appointmentRepository.findByUser(
      user._id,
      startOfDay,
      endOfDay,
    );

    // Generate available time slots (e.g., 30-minute intervals)
    const availableSlots = this.generateTimeSlots(
      businessLine.workingHours[0],
      businessLine.workingHours[1],
      appointments,
    );

    return {
      date,
      availableSlots,
      workingHours: businessLine.workingHours,
    };
  }

  private generateTimeSlots(
    startHour: number,
    endHour: number,
    appointments: any[],
  ) {
    const slots: Array<{ startTime: Date; endTime: Date }> = [];
    const startTime = new Date();
    startTime.setHours(startHour, 0, 0, 0);

    const endTime = new Date();
    endTime.setHours(endHour, 0, 0, 0);

    // Generate 30-minute slots
    while (startTime < endTime) {
      const slotEnd = new Date(startTime);
      slotEnd.setMinutes(startTime.getMinutes() + 30);

      // Check if slot is available
      const isBooked = appointments.some(
        (apt) =>
          (new Date(apt.startTime) <= startTime &&
            new Date(apt.endTime) > startTime) ||
          (new Date(apt.startTime) < slotEnd &&
            new Date(apt.endTime) >= slotEnd),
      );

      if (!isBooked) {
        slots.push({
          startTime: new Date(startTime),
          endTime: new Date(slotEnd),
        });
      }

      startTime.setMinutes(startTime.getMinutes() + 30);
    }

    return slots;
  }
}
