import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface BroadcastDto {
  message: string;
  imageUrl?: string;
}

@Injectable()
export class AdminBroadcastService {
  private readonly logger = new Logger(AdminBroadcastService.name);

  constructor(private prisma: PrismaService) {}

  async broadcast(data: BroadcastDto) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set');
    }

    const users = await this.prisma.user.findMany({
      where: { telegramId: { not: '' } },
      select: { telegramId: true },
    });

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        const url = data.imageUrl
          ? `https://api.telegram.org/bot${token}/sendPhoto`
          : `https://api.telegram.org/bot${token}/sendMessage`;

        const body = data.imageUrl
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

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const result = await response.json();
        if (result.ok) {
          sent++;
        } else {
          failed++;
          errors.push(`${user.telegramId}: ${result.description || 'unknown'}`);
        }

        // Telegram rate limit: ~30 msg/sec, ставим небольшую задержку
        await new Promise((r) => setTimeout(r, 50));
      } catch (e: any) {
        failed++;
        errors.push(`${user.telegramId}: ${e.message}`);
      }
    }

    this.logger.log(`Broadcast: sent=${sent}, failed=${failed}`);

    return {
      total: users.length,
      sent,
      failed,
      errors: errors.slice(0, 10),
    };
  }
}
