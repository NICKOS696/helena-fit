import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('telegram')
  async loginTelegram(@Body() body: { initData: string }) {
    try {
      const telegramData = this.parseTelegramInitData(body.initData);
      const user = await this.authService.validateTelegramUser(telegramData);
      return this.authService.loginTelegram(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid Telegram data');
    }
  }

  @Post('dev-login')
  async devLogin(@Body() body: { telegramId: string }) {
    // Только для разработки!
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Dev login not available in production');
    }
    return this.authService.devLogin(body.telegramId);
  }

  @Post('admin/login')
  async loginAdmin(@Body() body: { username: string; password: string }) {
    const admin = await this.authService.validateAdmin(body.username, body.password);
    return this.authService.loginAdmin(admin);
  }

  private parseTelegramInitData(initData: string): any {
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');
    
    if (!userParam) {
      throw new Error('User data not found');
    }

    return JSON.parse(userParam);
  }
}
