import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('api/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post(':slug')
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @Param('slug') slug: string,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingService.createBooking(slug, createBookingDto);
  }

  @Get('availability/:slug')
  async getAvailability(
    @Param('slug') slug: string,
    @Query('date') date: string,
  ) {
    return this.bookingService.getAvailability(slug, date);
  }
}
