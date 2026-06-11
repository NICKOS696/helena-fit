import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';

/**
 * Тесты для verifyAndParseInitData — самой чувствительной части (ошибка тут
 * заблокирует вход всем пользователям). Проверяем, что корректная подпись
 * проходит, а подделка/просрочка/рубильник работают как задумано.
 */
describe('AuthService.verifyAndParseInitData', () => {
  const BOT_TOKEN = '123456:TEST_BOT_TOKEN';

  // Собирает валидный initData по официальному алгоритму Telegram.
  function buildInitData(
    user: object,
    authDate: number,
    botToken = BOT_TOKEN,
  ): string {
    const params = new URLSearchParams();
    params.set('user', JSON.stringify(user));
    params.set('auth_date', String(authDate));
    params.set('query_id', 'AAH-test');

    const pairs: string[] = [];
    params.forEach((value, key) => pairs.push(`${key}=${value}`));
    pairs.sort();
    const dataCheckString = pairs.join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    const hash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    params.set('hash', hash);
    return params.toString();
  }

  function makeService(configValues: Record<string, string | undefined>) {
    const config = {
      get: (key: string) => configValues[key],
    };
    // Для этого метода нужен только ConfigService.
    return new AuthService(null as any, null as any, config as any);
  }

  const nowSec = () => Math.floor(Date.now() / 1000);

  it('принимает корректно подписанные данные и возвращает пользователя', () => {
    const service = makeService({ TELEGRAM_BOT_TOKEN: BOT_TOKEN });
    const user = { id: 42, username: 'helena', first_name: 'Helena' };
    const initData = buildInitData(user, nowSec());

    const parsed = service.verifyAndParseInitData(initData);
    expect(parsed.id).toBe(42);
    expect(parsed.username).toBe('helena');
  });

  it('отклоняет подделанную подпись', () => {
    const service = makeService({ TELEGRAM_BOT_TOKEN: BOT_TOKEN });
    const initData = buildInitData({ id: 1 }, nowSec());
    // Портим hash.
    const tampered = initData.replace(/hash=[a-f0-9]+/, 'hash=' + 'd'.repeat(64));

    expect(() => service.verifyAndParseInitData(tampered)).toThrow(
      UnauthorizedException,
    );
  });

  it('отклоняет данные, подписанные чужим токеном', () => {
    const service = makeService({ TELEGRAM_BOT_TOKEN: BOT_TOKEN });
    const initData = buildInitData({ id: 1 }, nowSec(), 'другой:токен');

    expect(() => service.verifyAndParseInitData(initData)).toThrow(
      UnauthorizedException,
    );
  });

  it('отклоняет просроченные initData', () => {
    const service = makeService({ TELEGRAM_BOT_TOKEN: BOT_TOKEN });
    const initData = buildInitData({ id: 1 }, nowSec() - 90000); // > 24ч

    expect(() => service.verifyAndParseInitData(initData)).toThrow(
      UnauthorizedException,
    );
  });

  it('fail-closed: без TELEGRAM_BOT_TOKEN бросает ошибку', () => {
    const service = makeService({});
    const initData = buildInitData({ id: 1 }, nowSec());

    expect(() => service.verifyAndParseInitData(initData)).toThrow(
      UnauthorizedException,
    );
  });

  it('рубильник DISABLE_TELEGRAM_SIGNATURE_CHECK пропускает без проверки', () => {
    const service = makeService({
      TELEGRAM_BOT_TOKEN: BOT_TOKEN,
      DISABLE_TELEGRAM_SIGNATURE_CHECK: 'true',
    });
    // Намеренно битый hash, но рубильник включён.
    const initData = buildInitData({ id: 7 }, nowSec()).replace(
      /hash=[a-f0-9]+/,
      'hash=deadbeef',
    );

    const parsed = service.verifyAndParseInitData(initData);
    expect(parsed.id).toBe(7);
  });

  it('отклоняет пустой initData', () => {
    const service = makeService({ TELEGRAM_BOT_TOKEN: BOT_TOKEN });
    expect(() => service.verifyAndParseInitData('')).toThrow(
      UnauthorizedException,
    );
  });
});
