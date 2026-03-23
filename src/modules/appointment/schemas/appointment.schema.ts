import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MeetingType } from 'src/common/enums/meeting-type.enum';

export type AppointmentDocument = HydratedDocument<Appointment>;

@Schema({ timestamps: true })
export class Appointment {
  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'BusinessLine',
    index: true,
  })
  businessLine: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  clientName: string;

  @Prop({ required: true })
  clientEmail: string;

  @Prop({ required: true, index: true })
  startTime: Date;

  @Prop({ required: true, index: true })
  endTime: Date;

  @Prop({ required: true, enum: MeetingType })
  meetingType: MeetingType;

  @Prop()
  meetingLink: string;

  @Prop({ default: 'confirmed' })
  status: string;

  @Prop()
  notes: string;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// Compound index for efficient conflict checking
AppointmentSchema.index({ user: 1, startTime: 1, endTime: 1 });
