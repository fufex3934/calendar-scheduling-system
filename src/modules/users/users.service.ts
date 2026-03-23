/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  /**
   * Create a new user (David's account)
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });
    if (existingUser) {
      throw new ConflictException(
        `User with email ${createUserDto.email} already exists`,
      );
    }

    const user = new this.userModel(createUserDto);
    return user.save();
  }

  /**
   * Find user by email (used for getting David's account)
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email })
      .populate('businessLines')
      .populate('appointments')
      .exec();
  }

  /**
   * Find user by ID
   */
  async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel
      .findById(id)
      .populate('businessLines')
      .populate({
        path: 'appointments',
        populate: { path: 'businessLine' },
      })
      .exec();
  }

  /**
   * Find user by ID or throw error
   */
  async findByIdOrThrow(id: string | Types.ObjectId): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * Find user by email or throw error
   */
  async findByEmailOrThrow(email: string): Promise<UserDocument | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  /**
   * Get all users
   */
  async findAll(): Promise<User[]> {
    return this.userModel
      .find()
      .populate('businessLines')
      .populate('appointments')
      .exec();
  }

  /**
   * Update user
   */
  async update(
    id: string | Types.ObjectId,
    updateUserDto: UpdateUserDto,
  ): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true, runValidators: true })
      .populate('businessLines')
      .exec();
  }

  /**
   * Delete user
   */
  async delete(id: string | Types.ObjectId): Promise<User | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  /**
   * Add appointment to user's appointments array
   */
  async addAppointment(
    userId: string | Types.ObjectId,
    appointmentId: string | Types.ObjectId,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $addToSet: { appointments: appointmentId } },
        { new: true },
      )
      .exec();
  }

  /**
   * Remove appointment from user's appointments array
   */
  async removeAppointment(
    userId: string | Types.ObjectId,
    appointmentId: string | Types.ObjectId,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $pull: { appointments: appointmentId } },
        { new: true },
      )
      .exec();
  }

  /**
   * Add business line to user's business lines array
   */
  async addBusinessLine(
    userId: string | Types.ObjectId,
    businessLineId: string | Types.ObjectId,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $addToSet: { businessLines: businessLineId } },
        { new: true },
      )
      .exec();
  }

  /**
   * Get user's calendar for a date range (all appointments)
   */
  async getUserCalendar(
    userId: string | Types.ObjectId,
    startDate?: Date,
    endDate?: Date,
  ) {
    const user = await this.findByIdOrThrow(userId);

    // Ensure appointments are populated
    let appointments = user.appointments || [];

    // Filter by date range if provided
    if (startDate && endDate && Array.isArray(appointments)) {
      appointments = appointments.filter((apt: any) => {
        const aptStart = new Date(apt.startTime);
        const aptEnd = new Date(apt.endTime);
        return aptStart >= startDate && aptEnd <= endDate;
      });
    }

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      appointments: (Array.isArray(appointments) ? appointments : []).sort(
        (a: any, b: any) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      ),
      businessLines: user.businessLines || [],
    };
  }
  /**
   * Check if user has any appointments at given time
   */
  async isUserAvailable(
    userId: string | Types.ObjectId,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string | Types.ObjectId,
  ): Promise<boolean> {
    const user = await this.findByIdOrThrow(userId);

    const conflictingAppointment = (user.appointments || []).find(
      (apt: any) => {
        // Skip the appointment we're checking (for updates)
        if (
          excludeAppointmentId &&
          apt._id.toString() === excludeAppointmentId.toString()
        ) {
          return false;
        }

        const aptStart = new Date(apt.startTime);
        const aptEnd = new Date(apt.endTime);

        // Check for overlap
        return startTime < aptEnd && endTime > aptStart;
      },
    );

    return !conflictingAppointment;
  }
}
