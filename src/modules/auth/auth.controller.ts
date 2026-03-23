/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from 'src/common/guards/local-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() registerDto: any) {
    return this.authService.register(registerDto);
  }
}
