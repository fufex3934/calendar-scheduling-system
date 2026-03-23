import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { BusinessLineService } from './business-line.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { CreateBusinessLineDto } from './dto/create-business-line.dto';

@Controller('api/business-lines')
export class BusinessLineController {
  constructor(private readonly businessLineService: BusinessLineService) {}

  @Get()
  async findAll() {
    return this.businessLineService.findAll();
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.businessLineService.findBySlug(slug);
  }

  // Public endpoints (no auth)
  @Get('public')
  async getAllPublic() {
    return this.businessLineService.getAllPublicBusinessLines();
  }

  @Get('public/:slug')
  async getPublic(@Param('slug') slug: string) {
    return this.businessLineService.getPublicBusinessLine(slug);
  }

  // Admin endpoints (require JWT + admin role)
  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async create(@Body() createBusinessLineDto: CreateBusinessLineDto) {
    return this.businessLineService.create(createBusinessLineDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() updateBusinessLineDto: CreateBusinessLineDto,
  ) {
    return this.businessLineService.update(id, updateBusinessLineDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async delete(@Param('id') id: string) {
    return this.businessLineService.delete(id);
  }
}
