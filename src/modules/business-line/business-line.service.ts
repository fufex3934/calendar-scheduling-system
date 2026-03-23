import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { BusinessLineRepository } from './business-line.repository';
import { CreateBusinessLineDto } from './dto/create-business-line.dto';
import { UpdateBusinessLineDto } from './dto/update-business-line.dto';
import { MeetingType } from '../../common/enums/meeting-type.enum';
import { BusinessLineDocument } from './schemas/business-line.schema';

@Injectable()
export class BusinessLineService {
  constructor(private businessLineRepository: BusinessLineRepository) {}

  /**
   * Create a new business line (service type)
   */
  async create(createBusinessLineDto: CreateBusinessLineDto) {
    // Check if slug already exists
    const existingSlug = await this.businessLineRepository.findBySlug(
      createBusinessLineDto.slug,
    );

    if (existingSlug) {
      throw new ConflictException(
        `Business line with slug '${createBusinessLineDto.slug}' already exists`,
      );
    }

    // Validate working hours (only if provided)
    if (createBusinessLineDto.workingHours) {
      this.validateWorkingHours(createBusinessLineDto.workingHours);
    }

    // Validate meeting types
    this.validateMeetingTypes(createBusinessLineDto.allowedMeetingTypes);

    const businessLine = await this.businessLineRepository.create(
      createBusinessLineDto,
    );
    return businessLine;
  }

  /**
   * Find all business lines
   */
  async findAll() {
    return this.businessLineRepository.findAll();
  }

  /**
   * Find business line by ID
   */
  async findById(id: string): Promise<BusinessLineDocument> {
    const businessLine = await this.businessLineRepository.findById(id);
    if (!businessLine) {
      throw new NotFoundException(`Business line with ID ${id} not found`);
    }
    return businessLine;
  }

  /**
   * Find business line by slug (used for booking links)
   */
  async findBySlug(slug: string): Promise<BusinessLineDocument> {
    const businessLine = await this.businessLineRepository.findBySlug(slug);
    if (!businessLine) {
      throw new NotFoundException(
        `Business line with slug '${slug}' not found`,
      );
    }
    return businessLine;
  }

  /**
   * Update business line
   */
  async update(id: string, updateBusinessLineDto: UpdateBusinessLineDto) {
    // Check if business line exists
    await this.findById(id);

    // Validate slug uniqueness if it's being updated
    if (updateBusinessLineDto.slug) {
      const existingSlug = await this.businessLineRepository.findBySlug(
        updateBusinessLineDto.slug,
      );

      if (existingSlug && existingSlug._id.toString() !== id) {
        throw new ConflictException(
          `Business line with slug '${updateBusinessLineDto.slug}' already exists`,
        );
      }
    }

    // Validate working hours if provided
    if (updateBusinessLineDto.workingHours) {
      this.validateWorkingHours(updateBusinessLineDto.workingHours);
    }

    // Validate meeting types if provided
    if (updateBusinessLineDto.allowedMeetingTypes) {
      this.validateMeetingTypes(updateBusinessLineDto.allowedMeetingTypes);
    }

    return this.businessLineRepository.update(id, updateBusinessLineDto);
  }

  /**
   * Delete business line
   */
  async delete(id: string) {
    await this.findById(id);
    return this.businessLineRepository.delete(id);
  }

  /**
   * Get business line with booking statistics
   */
  async getBusinessLineStats(id: string) {
    const businessLine = await this.findById(id);

    return {
      id: businessLine._id,
      name: businessLine.name,
      slug: businessLine.slug,
      description: businessLine.description,
      allowedMeetingTypes: businessLine.allowedMeetingTypes,
      workingHours: businessLine.workingHours,
      defaultDuration: businessLine.defaultDuration,
    };
  }

  /**
   * Get public business line data (for client-facing booking page)
   */
  async getPublicBusinessLine(slug: string) {
    const businessLine = await this.findBySlug(slug);

    return {
      id: businessLine._id,
      name: businessLine.name,
      description: businessLine.description,
      slug: businessLine.slug,
      allowedMeetingTypes: businessLine.allowedMeetingTypes,
      defaultDuration: businessLine.defaultDuration,
      workingHours: businessLine.workingHours,
      bookingUrl: `/api/bookings/${businessLine.slug}`,
    };
  }

  /**
   * Get all public business lines (for client-facing display)
   */
  async getAllPublicBusinessLines() {
    const businessLines = await this.findAll();

    return businessLines.map((bl: BusinessLineDocument) => ({
      id: bl._id,
      name: bl.name,
      description: bl.description,
      slug: bl.slug,
      allowedMeetingTypes: bl.allowedMeetingTypes,
      defaultDuration: bl.defaultDuration,
      workingHours: bl.workingHours,
      bookingUrl: `/api/bookings/${bl.slug}`,
    }));
  }

  /**
   * Check if business line allows specific meeting type
   */
  async allowsMeetingType(
    slug: string,
    meetingType: MeetingType,
  ): Promise<boolean> {
    const businessLine = await this.findBySlug(slug);
    return businessLine.allowedMeetingTypes.includes(meetingType);
  }

  /**
   * Get default duration for business line
   */
  async getDefaultDuration(slug: string): Promise<number> {
    const businessLine = await this.findBySlug(slug);
    return businessLine.defaultDuration;
  }

  /**
   * Get working hours for business line
   */
  async getWorkingHours(slug: string): Promise<number[]> {
    const businessLine = await this.findBySlug(slug);
    return businessLine.workingHours;
  }

  /**
   * Validate working hours format
   */
  private validateWorkingHours(workingHours: number[]): void {
    if (!workingHours || workingHours.length !== 2) {
      throw new BadRequestException(
        'Working hours must be an array with [startHour, endHour]',
      );
    }

    const [startHour, endHour] = workingHours;

    if (startHour < 0 || startHour > 23) {
      throw new BadRequestException('Start hour must be between 0 and 23');
    }

    if (endHour < 1 || endHour > 24) {
      throw new BadRequestException('End hour must be between 1 and 24');
    }

    if (startHour >= endHour) {
      throw new BadRequestException('Start hour must be less than end hour');
    }
  }

  /**
   * Validate meeting types
   */
  private validateMeetingTypes(meetingTypes: MeetingType[]): void {
    const validTypes = Object.values(MeetingType);

    for (const type of meetingTypes) {
      if (!validTypes.includes(type)) {
        throw new BadRequestException(
          `Invalid meeting type: ${type}. Valid types: ${validTypes.join(', ')}`,
        );
      }
    }
  }
}
