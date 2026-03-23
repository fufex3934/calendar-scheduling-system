/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { InjectModel } from '@nestjs/mongoose';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';
import { Model, Types } from 'mongoose';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

export class AppointmentRepository {
  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
  ) {}

  async create(
    createAppointmentDto: CreateAppointmentDto,
  ): Promise<AppointmentDocument> {
    const newAppointment = new this.appointmentModel(createAppointmentDto);
    return newAppointment.save();
  }

  async findConflictingAppointments(
    userId: Types.ObjectId,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: Types.ObjectId,
  ): Promise<AppointmentDocument[]> {
    const query: any = {
      user: userId,
      status: 'confirmed',
      $or: [
        // New appointment starts during existing appointment
        { startTime: { $lt: endTime, $gte: startTime } },
        // New appointment ends during existing appointment
        { endTime: { $gt: startTime, $lte: endTime } },
        // New appointment completely contains existing appointment
        {
          startTime: { $lte: startTime },
          endTime: { $gte: endTime },
        },
      ],
    };

    if (excludeAppointmentId) {
      query._id = { $ne: excludeAppointmentId };
    }

    return this.appointmentModel.find(query).exec();
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
}
