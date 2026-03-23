/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';
import { Model, Types } from 'mongoose';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentRepository {
  private readonly logger = new Logger(AppointmentRepository.name);

  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
  ) {}

  async create(
    createAppointmentDto: CreateAppointmentDto,
  ): Promise<AppointmentDocument> {
    const newAppointment = new this.appointmentModel({
      ...createAppointmentDto,
      startTime: new Date(createAppointmentDto.startTime),
      endTime: new Date(createAppointmentDto.endTime),
    });
    return newAppointment.save();
  }

  /**
   * FIXED: Properly detect ALL overlapping appointments with population
   */
  async findConflictingAppointments(
    userId: Types.ObjectId,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: Types.ObjectId,
  ): Promise<AppointmentDocument[]> {
    // Ensure we're working with Date objects
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Remove milliseconds for accurate comparison
    start.setMilliseconds(0);
    end.setMilliseconds(0);

    this.logger.debug(
      `Checking conflicts for user ${userId} from ${start.toISOString()} to ${end.toISOString()}`,
    );

    // Query for overlapping appointments using the simple overlap formula
    const query: any = {
      user: userId,
      status: { $in: ['confirmed', 'in-progress'] },
      startTime: { $lt: end }, // Existing starts before new ends
      endTime: { $gt: start }, // Existing ends after new starts
    };

    // Exclude current appointment if updating
    if (excludeAppointmentId) {
      query._id = { $ne: excludeAppointmentId };
    }

    // Execute query with population
    const conflicts = await this.appointmentModel
      .find(query)
      .populate('businessLine')
      .lean()
      .exec();

    this.logger.debug(`Found ${conflicts.length} conflicting appointments`);

    if (conflicts.length > 0) {
      conflicts.forEach((conflict) => {
        this.logger.debug(
          `Conflict: ${conflict.startTime} - ${conflict.endTime}, Business: ${(conflict.businessLine as any)?.name}`,
        );
      });
    }

    return conflicts;
  }

  /**
   * Alternative: Direct MongoDB query with raw results
   */
  async findConflictingAppointmentsRaw(
    userId: Types.ObjectId,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    const start = new Date(startTime);
    const end = new Date(endTime);

    start.setMilliseconds(0);
    end.setMilliseconds(0);

    // Use MongoDB aggregation for more control
    const pipeline = [
      {
        $match: {
          user: userId,
          status: { $in: ['confirmed', 'in-progress'] },
          startTime: { $lt: end },
          endTime: { $gt: start },
        },
      },
      {
        $lookup: {
          from: 'businesslines',
          localField: 'businessLine',
          foreignField: '_id',
          as: 'businessLineDetails',
        },
      },
      {
        $unwind: {
          path: '$businessLineDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const result = await this.appointmentModel.aggregate(pipeline).exec();
    return result;
  }

  async findByUser(
    userId: Types.ObjectId,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AppointmentDocument[]> {
    const query: any = { user: userId };

    if (startDate && endDate) {
      query.startTime = { $gte: startDate, $lte: endDate };
    }

    return this.appointmentModel
      .find(query)
      .populate('businessLine')
      .sort({ startTime: 1 })
      .exec();
  }

  async findById(id: Types.ObjectId) {
    return this.appointmentModel.findById(id).populate('businessLine').exec();
  }

  async updateStatus(id: Types.ObjectId, status: string) {
    return this.appointmentModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
  }

  async findAllForUser(userId: Types.ObjectId) {
    return this.appointmentModel
      .find({ user: userId })
      .populate('businessLine')
      .sort({ startTime: -1 })
      .exec();
  }

  async cancelAppointment(id: Types.ObjectId) {
    return this.appointmentModel
      .findByIdAndUpdate(id, { status: 'cancelled' }, { new: true })
      .exec();
  }

  /**
   * Debug method to get all appointments for a user
   */
  async getAllAppointmentsForUser(
    userId: Types.ObjectId,
  ): Promise<AppointmentDocument[]> {
    return this.appointmentModel
      .find({ user: userId })
      .populate('businessLine')
      .sort({ startTime: 1 })
      .exec();
  }
}
