import { Controller, Post, Body, Headers, Get, Query, UseGuards, Request } from '@nestjs/common';
import { PaymeService } from './payme.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payme')
export class PaymeController {
  constructor(private readonly paymeService: PaymeService) {}

  /**
   * Создать ссылку на оплату
   * POST /api/payme/create-payment
   */
  @Post('create-payment')
  @UseGuards(JwtAuthGuard)
  async createPayment(
    @Request() req,
    @Body() body: {
      collectionId: string;
      collectionType: 'WORKOUT' | 'RECIPE';
      amount: number;
    },
  ) {
    console.log('req.user:', req.user); // Отладка
    const userId = req.user.sub || req.user.id; // JWT payload использует 'sub' или 'id'
    
    if (!userId) {
      throw new Error('User ID not found in JWT payload');
    }
    
    const paymentUrl = await this.paymeService.createPaymentLink({
      userId,
      collectionId: body.collectionId.toString(),
      collectionType: body.collectionType,
      amount: body.amount,
    });

    return {
      success: true,
      paymentUrl,
    };
  }

  /**
   * Webhook от Payme
   * POST /api/payme/callback
   */
  @Post('callback')
  async handleCallback(
    @Body() body: any,
    @Headers('authorization') authorization: string,
  ) {
    return await this.paymeService.handleWebhook(body, authorization);
  }
}
