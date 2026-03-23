import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BookingService } from '../modules/booking/booking.service';
import { AppointmentRepository } from '../modules/appointment/appointment.repository';
import { BusinessLineRepository } from '../modules/business-line/business-line.repository';
import { UserService } from '../modules/users/users.service';
import { MeetingType } from '../common/enums/meeting-type.enum';

async function testOverlap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const bookingService = app.get(BookingService);
  const appointmentRepo = app.get(AppointmentRepository);
  const businessLineRepo = app.get(BusinessLineRepository);
  const userService = app.get(UserService);

  console.log('\n=== Testing Overlap Detection ===\n');

  const user = await userService.findByEmail('david@company.com');
  if (!user) {
    console.error('❌ User "david@company.com" not found!');
    console.log('Please create the user first by registering or seeding data.');
    await app.close();
    return;
  }

  console.log(`✅ User found: ${user.name} (${user._id})`);

  const allAppointments = await appointmentRepo.getAllAppointmentsForUser(
    user._id,
  );
  console.log(`\n📅 Existing Appointments (${allAppointments.length}):`);

  if (allAppointments.length === 0) {
    console.log('  No existing appointments found.');
    console.log(
      '  Please create at least one appointment first to test overlaps.',
    );
  } else {
    allAppointments.forEach((apt) => {
      console.log(
        `  - ${apt.startTime.toLocaleString()} to ${apt.endTime.toLocaleString()} (${(apt.businessLine as any)?.name}) [${apt.status}]`,
      );
    });
  }
  console.log('');

  const testScenarios = [
    {
      name: 'Same time as existing',
      start: new Date('2026-03-25T10:00:00Z'),
      end: new Date('2026-03-25T11:00:00Z'),
      shouldConflict: true,
    },
    {
      name: 'Overlap start inside existing',
      start: new Date('2026-03-25T10:30:00Z'),
      end: new Date('2026-03-25T11:30:00Z'),
      shouldConflict: true,
    },
    {
      name: 'Overlap end inside existing',
      start: new Date('2026-03-25T09:30:00Z'),
      end: new Date('2026-03-25T10:30:00Z'),
      shouldConflict: true,
    },
    {
      name: 'Completely inside existing',
      start: new Date('2026-03-25T10:15:00Z'),
      end: new Date('2026-03-25T10:45:00Z'),
      shouldConflict: true,
    },
    {
      name: 'Completely contains existing',
      start: new Date('2026-03-25T09:00:00Z'),
      end: new Date('2026-03-25T12:00:00Z'),
      shouldConflict: true,
    },
    {
      name: 'No overlap (before)',
      start: new Date('2026-03-25T08:00:00Z'),
      end: new Date('2026-03-25T09:00:00Z'),
      shouldConflict: false,
    },
    {
      name: 'No overlap (after)',
      start: new Date('2026-03-25T13:00:00Z'),
      end: new Date('2026-03-25T14:00:00Z'),
      shouldConflict: false,
    },
  ];

  console.log('=== Testing Conflict Scenarios ===\n');

  for (const scenario of testScenarios) {
    console.log(`🔍 Testing: ${scenario.name}`);
    console.log(
      `  📍 Time: ${scenario.start.toLocaleString()} - ${scenario.end.toLocaleString()}`,
    );

    const conflicts = await appointmentRepo.findConflictingAppointments(
      user._id,
      scenario.start,
      scenario.end,
    );
    const hasConflict = conflicts.length > 0;
    const passed = hasConflict === scenario.shouldConflict;

    console.log(`  📊 Conflicts found: ${conflicts.length}`);
    if (conflicts.length > 0) {
      conflicts.forEach((c) => {
        console.log(
          `    ⚠️  ${c.startTime.toLocaleString()} to ${c.endTime.toLocaleString()} (${(c.businessLine as any)?.name})`,
        );
      });
    }
    console.log(`  🎯 Expected conflict: ${scenario.shouldConflict}`);
    console.log(`  ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('');
  }

  // Additional test: Try to create overlapping booking via service
  console.log('=== Testing via Booking Service ===\n');

  const businessLines = await businessLineRepo.findAll();
  if (businessLines.length === 0) {
    console.log(
      '❌ No business lines found. Please create business lines first.',
    );
  } else {
    const testBusinessLine = businessLines[0];
    console.log(`Testing with business line: ${testBusinessLine.name}`);

    const overlappingBooking = {
      clientName: 'Test Overlap User',
      clientEmail: 'test@example.com',
      startTime: '2026-03-25T10:30:00.000Z',
      endTime: '2026-03-25T11:30:00.000Z',
      meetingType: MeetingType.ZOOM, // ✅ Use enum here
      notes: 'This should fail if there is an existing appointment',
    };

    console.log('\nAttempting to create overlapping booking...');
    console.log(
      `  Time: ${new Date(overlappingBooking.startTime).toLocaleString()} - ${new Date(overlappingBooking.endTime).toLocaleString()}`,
    );

    try {
      const result = await bookingService.createBooking(
        testBusinessLine.slug,
        overlappingBooking,
      );
      console.log('  ❌ Booking was created unexpectedly!');
      console.log(`  Result: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.log('  ✅ Booking correctly rejected with error:');
      console.log(`  ${error.message}`);
    }
  }

  await app.close();
  console.log('\n=== Test Complete ===\n');
}

testOverlap().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
