// business-line.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessLineService } from './business-line.service';
import { BusinessLineController } from './business-line.controller';
import { BusinessLineRepository } from './business-line.repository';
import {
  BusinessLine,
  BusinessLineSchema,
} from './schemas/business-line.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BusinessLine.name, schema: BusinessLineSchema },
    ]),
  ],
  controllers: [BusinessLineController],
  providers: [BusinessLineService, BusinessLineRepository],
  exports: [BusinessLineService, BusinessLineRepository],
})
export class BusinessLineModule {}
