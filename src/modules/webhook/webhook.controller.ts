import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('api/webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('zoom')
  @HttpCode(HttpStatus.OK)
  async handleZoomWebhook(
    @Body() payload: any,
    @Headers('authorization') auth: string,
  ) {
    // Verify webhook signature
    // const isValid = this.verifyZoomSignature(auth, payload);
    // if (!isValid) throw new UnauthorizedException();

    return this.webhookService.handleZoomWebhook(payload);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async handleGoogleWebhook(@Body() payload: any, @Headers() headers: any) {
    // Verify webhook token
    // const isValid = this.verifyGoogleToken(headers);
    // if (!isValid) throw new UnauthorizedException();

    return this.webhookService.handleGoogleWebhook({ headers, body: payload });
  }

  // Verify Zoom webhook signature
  private verifyZoomSignature(auth: string, payload: any): boolean {
    // Implement Zoom signature verification
    // https://marketplace.zoom.us/docs/api-reference/webhooks/reference/validation
    return true;
  }
}
