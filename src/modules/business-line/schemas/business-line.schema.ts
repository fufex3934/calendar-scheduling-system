import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MeetingType } from 'src/common/enums/meeting-type.enum';

export type BusinessLineDocument = HydratedDocument<BusinessLine>;

@Schema({ timestamps: true })
export class BusinessLine {
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], enum: MeetingType, default: [MeetingType.ZOOM] })
  allowedMeetingTypes: MeetingType[];

  @Prop({ default: 60 })
  defaultDuration: number;

  @Prop({ type: [Number], default: [9, 17] })
  workingHours: number[];
}

export const BusinessLineSchema = SchemaFactory.createForClass(BusinessLine);
