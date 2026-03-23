import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Appointment' }] })
  appointments: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'BusinessLine' }] })
  businessLines: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);
