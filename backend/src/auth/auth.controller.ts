import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('telegram')
  async loginTelegram(@Body() body: { initData: string }) {
    // Проверка подписи initData выполняется внутри verifyAndParseInitData и
    // бросает UnauthorizedException при невалидной подписи/просроченных данных.
    const telegramData = this.authService.verifyAndParseInitData(body?.initData);
    const user = await this.authService.validateTelegramUser(telegramData);
    return this.authService.loginTelegram(user);
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
}
