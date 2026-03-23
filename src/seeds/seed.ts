import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/users/users.service';
import { BusinessLineRepository } from '../modules/business-line/business-line.repository';
import { MeetingType } from '../common/enums/meeting-type.enum';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userService = app.get(UserService);
  const businessLineRepo = app.get(BusinessLineRepository);

  // Create David's user account
  await userService.create({
    name: 'David',
    email: 'david@company.com',
  });

  // Create business lines
  await businessLineRepo.create({
    slug: 'law-firm',
    name: 'Law Firm',
    description: 'Legal consultations and services',
    allowedMeetingTypes: [
      MeetingType.ZOOM,
      MeetingType.GOOGLE_MEET,
      MeetingType.PHONE,
    ],
    defaultDuration: 60,
    workingHours: [9, 17],
  });

  await businessLineRepo.create({
    slug: 'tax-preparation',
    name: 'Tax Preparation',
    description: 'Tax filing and preparation services',
    allowedMeetingTypes: [MeetingType.ZOOM, MeetingType.PHONE],
    defaultDuration: 90,
    workingHours: [9, 17],
  });

  await businessLineRepo.create({
    slug: 'tax-strategy',
    name: 'Tax Strategy',
    description: 'Strategic tax planning and optimization',
    allowedMeetingTypes: [MeetingType.ZOOM, MeetingType.GOOGLE_MEET],
    defaultDuration: 45,
    workingHours: [10, 16],
  });

  console.log('Seed data created successfully');
  await app.close();
}

void seed();
