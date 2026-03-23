import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingModule } from './modules/booking/booking.module';
import { BusinessLineModule } from './modules/business-line/business-line.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { UserModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      // eslint-disable-next-line @typescript-eslint/require-await
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('mongodbUri'),
      }),
      inject: [ConfigService],
    }),
    BookingModule,
    BusinessLineModule,
    AppointmentModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
