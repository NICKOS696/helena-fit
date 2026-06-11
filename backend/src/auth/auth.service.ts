import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// Максимальный возраст initData (защита от replay-атак), сек. 24 часа по умолчанию.
const INIT_DATA_MAX_AGE_SEC = 86400;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  /**
   * Проверяет подпись Telegram WebApp initData и возвращает распарсенные данные
   * пользователя. Бросает UnauthorizedException, если подпись невалидна.
   *
   * Алгоритм Telegram:
   *   secret_key = HMAC_SHA256(key="WebAppData", data=bot_token)
   *   hash       = HEX(HMAC_SHA256(key=secret_key, data=data_check_string))
   * где data_check_string — все поля, кроме hash, отсортированные по ключу
   * и склеенные как `key=value` через \n.
   *
   * Аварийный рубильник: DISABLE_TELEGRAM_SIGNATURE_CHECK=true отключает
   * проверку без передеплоя (только на крайний случай — это дыра в доступе).
   */
  verifyAndParseInitData(initData: string): any {
    if (!initData || typeof initData !== 'string') {
      throw new UnauthorizedException('initData is missing');
    }

    const params = new URLSearchParams(initData);
    const userParam = params.get('user');
    if (!userParam) {
      throw new UnauthorizedException('User data not found in initData');
    }

    const skipCheck =
      this.config.get<string>('DISABLE_TELEGRAM_SIGNATURE_CHECK') === 'true';

    if (skipCheck) {
      this.logger.warn(
        'Telegram signature check is DISABLED via DISABLE_TELEGRAM_SIGNATURE_CHECK — insecure, use only for emergency rollback',
      );
      return JSON.parse(userParam);
    }

    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      // Fail-closed: без токена подпись проверить нельзя, пускать нельзя.
      this.logger.error('TELEGRAM_BOT_TOKEN is not set — cannot verify initData');
      throw new UnauthorizedException('Telegram verification is not configured');
    }

    const hash = params.get('hash');
    if (!hash) {
      throw new UnauthorizedException('initData hash is missing');
    }

    // Строим data_check_string из всех полей кроме hash.
    const pairs: string[] = [];
    params.forEach((value, key) => {
      if (key === 'hash') return;
      pairs.push(`${key}=${value}`);
    });
    pairs.sort();
    const dataCheckString = pairs.join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Сравнение, устойчивое к timing-атакам.
    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid Telegram signature');
    }

    // Защита от replay: initData не должна быть слишком старой.
    const authDate = Number(params.get('auth_date'));
    if (authDate) {
      const ageSec = Math.floor(Date.now() / 1000) - authDate;
      if (ageSec > INIT_DATA_MAX_AGE_SEC) {
        throw new UnauthorizedException('initData is expired');
      }
    }

    return JSON.parse(userParam);
  }

  async validateTelegramUser(telegramData: any) {
    const { id, username, first_name, last_name, photo_url } = telegramData;

    let user = await this.prisma.user.findUnique({
      where: { telegramId: String(id) },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId: String(id),
          username: username || null,
          firstName: first_name || null,
          lastName: last_name || null,
          photoUrl: photo_url || null,
          status: 'ACTIVE',
        },
      });
    } else {
      // Обновляем данные пользователя при каждом входе
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          username: username || user.username,
          firstName: first_name || user.firstName,
          lastName: last_name || user.lastName,
          photoUrl: photo_url || user.photoUrl,
          status: 'ACTIVE',
        },
      });
    }

    return user;
  }

  async validateAdmin(username: string, password: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { username },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return admin;
  }

  async loginTelegram(user: any) {
    const payload = { sub: user.id, telegramId: user.telegramId, type: 'user' };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async loginAdmin(admin: any) {
    const payload = { sub: admin.id, username: admin.username, role: admin.role, type: 'admin' };
    return {
      access_token: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    };
  }

  async devLogin(telegramId: string) {
    // Находим или создаем пользователя
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      throw new Error(`User with telegramId ${telegramId} not found`);
    }

    const payload = { sub: user.id, telegramId: user.telegramId, type: 'user' };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
