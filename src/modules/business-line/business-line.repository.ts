import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BusinessLine,
  BusinessLineDocument,
} from './schemas/business-line.schema';

@Injectable()
export class BusinessLineRepository {
  constructor(
    @InjectModel(BusinessLine.name)
    private businessLineModel: Model<BusinessLineDocument>,
  ) {}

  async findAll(): Promise<BusinessLine[]> {
    return this.businessLineModel.find().exec();
  }

  async findById(
    id: string | Types.ObjectId,
  ): Promise<BusinessLineDocument | null> {
    return this.businessLineModel.findById(id).exec();
  }

  async findBySlug(slug: string): Promise<BusinessLineDocument | null> {
    return this.businessLineModel.findOne({ slug }).exec();
  }

  async create(data: Partial<BusinessLine>): Promise<BusinessLine> {
    const businessLine = new this.businessLineModel(data);
    return businessLine.save();
  }

  async update(
    id: string | Types.ObjectId,
    data: Partial<BusinessLine>,
  ): Promise<BusinessLineDocument | null> {
    return this.businessLineModel
      .findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .exec();
  }

  async delete(
    id: string | Types.ObjectId,
  ): Promise<BusinessLineDocument | null> {
    return this.businessLineModel.findByIdAndDelete(id).exec();
  }

  async findBySlugs(slugs: string[]): Promise<BusinessLineDocument[]> {
    return this.businessLineModel.find({ slug: { $in: slugs } }).exec();
  }
}
