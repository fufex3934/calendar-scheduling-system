import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  password?: string; // Optional for now, will add auth later

  @IsOptional()
  businessLines?: string[]; // Array of BusinessLine IDs

  @IsOptional()
  appointments?: string[]; // Array of Appointment IDs
}
