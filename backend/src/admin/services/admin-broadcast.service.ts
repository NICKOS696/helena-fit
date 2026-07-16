import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface BroadcastDto {
  message: string;
  imageUrl?: string;
  /** Текст кнопки под сообщением (вместе с buttonUrl) */
  buttonText?: string;
  /** Куда ведёт кнопка — https-ссылка на Mini App (открывается как web_app) */
  buttonUrl?: string;
  /** Тестовая отправка — только владельцу, не всей базе */
  test?: boolean;
}

// Прямой IPv4-маршрут к Telegram с хостинга мёртв — контейнер ходит через
// socat-туннель на хосте (см. docker-compose: extra_hosts + TELEGRAM_API_BASE).
const API_BASE = process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';
const OWNER_TELEGRAM_ID = process.env.OWNER_TELEGRAM_ID || '89761488';

@Injectable()
export class AdminBroadcastService {
  private readonly logger = new Logger(AdminBroadcastService.name);

  constructor(private prisma: PrismaService) {}

  async broadcast(data: BroadcastDto) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set');
    }

    const recipients = data.test
      ? [{ telegramId: OWNER_TELEGRAM_ID }]
      : await this.prisma.user.findMany({
          where: { telegramId: { not: '' } },
          select: { telegramId: true },
        });

    const url = data.imageUrl
      ? `${API_BASE}/bot${token}/sendPhoto`
      : `${API_BASE}/bot${token}/sendMessage`;

    // Для боевой рассылки пишем запись в журнал и метим кнопку ?bc=<id> —
    // по метке бот фиксирует переход (аналитика «Рассылки»)
    let broadcastId: string | null = null;
    let buttonUrl = data.buttonUrl;
    if (!data.test) {
      const rec = await this.prisma.broadcast.create({
        data: {
          message: data.message.slice(0, 500),
          buttonText: data.buttonText || null,
          buttonUrl: data.buttonUrl || null,
          imageUrl: data.imageUrl || null,
          total: recipients.length,
        },
      });
      broadcastId = rec.id;
      if (buttonUrl) {
        buttonUrl += (buttonUrl.includes('?') ? '&' : '?') + `bc=${rec.id}`;
      }
    }

    // Кнопка под сообщением (открывает Mini App)
    const replyMarkup =
      data.buttonText && buttonUrl
        ? {
            inline_keyboard: [
              [{ text: data.buttonText, web_app: { url: buttonUrl } }],
            ],
          }
        : undefined;

    let sent = 0;
    let blocked = 0; // 403 — заблокировали бота
    let deleted = 0; // 400 chat not found / deactivated — удалили аккаунт или не запускали
    let other = 0; // прочие ошибки (таймауты и т.п.)
    const errors: string[] = [];

    for (const user of recipients) {
      try {
        const body: any = data.imageUrl
          ? {
              chat_id: user.telegramId,
              photo: data.imageUrl,
              caption: data.message,
              parse_mode: 'HTML',
            }
          : {
              chat_id: user.telegramId,
              text: data.message,
              parse_mode: 'HTML',
            };
        if (replyMarkup) body.reply_markup = replyMarkup;

        // Таймаут, чтобы одно зависшее соединение не остановило всю рассылку
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        let result: any;
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          result = await response.json();
        } finally {
          clearTimeout(timer);
        }

        if (result.ok) {
          sent++;
        } else if (result.error_code === 429) {
          // Лимит Telegram: ждём сколько попросили и повторяем один раз
          const wait = (result.parameters?.retry_after || 3) * 1000;
          await new Promise((r) => setTimeout(r, wait));
          const retry = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }).then((r) => r.json());
          if (retry.ok) sent++;
          else {
            other++;
            errors.push(`${user.telegramId}: ${retry.description || 'retry failed'}`);
          }
        } else if (result.error_code === 403) {
          blocked++;
        } else if (
          result.error_code === 400 &&
          /chat not found|deactivated/i.test(result.description || '')
        ) {
          deleted++;
        } else {
          other++;
          errors.push(`${user.telegramId}: ${result.description || 'unknown'}`);
        }

        // Telegram rate limit: ~30 msg/сек
        await new Promise((r) => setTimeout(r, 50));
      } catch (e: any) {
        other++;
        errors.push(`${user.telegramId}: ${e.message}`);
      }
    }

    this.logger.log(
      `Broadcast${data.test ? ' (test)' : ''}: sent=${sent}, blocked=${blocked}, deleted=${deleted}, other=${other}`,
    );

    // Финальные цифры — в журнал рассылок
    if (broadcastId) {
      await this.prisma.broadcast
        .update({
          where: { id: broadcastId },
          data: { sent, blocked, deleted },
        })
        .catch(() => undefined);
    }

    return {
      test: !!data.test,
      total: recipients.length,
      sent,
      blocked,
      deleted,
      other,
      failed: blocked + deleted + other,
      errors: errors.slice(0, 10),
    };
  }
}
