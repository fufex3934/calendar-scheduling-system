import { Controller, Get, Param } from '@nestjs/common';
import { BusinessLineService } from './business-line.service';

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
}
