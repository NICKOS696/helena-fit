import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Напоминания клиентам тренера («Мой прогресс») от лица Елены.
 *
 * Две цепочки:
 *  1) Клиент ещё не внёс ни одного замера — «заполните анкету, замеры и фото»:
 *     через 2 дня после добавления, затем ещё через 3 дня, затем раз в неделю (ещё 3 раза).
 *  2) Замеры уже есть — следующий отчёт через месяц после последнего замера:
 *     за 2 дня до срока, в день срока и один раз через 2 дня после срока.
 *
 * Каждая отправка фиксируется в client_reminders (уникально на клиента/вид/срок),
 * поэтому повторов не бывает даже после перезапуска контейнера.
 *
 * Режим — переменная CLIENT_REMINDERS:
 *   off  — ничего не отправляем;
 *   test — всё, что ушло бы клиентам, уходит ТОЛЬКО владельцу с пометкой, журнал не пишется;
 *   on   — боевой режим.
 */

const API_BASE = process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';
const OWNER_TELEGRAM_ID = process.env.OWNER_TELEGRAM_ID || '89761488';
const TZ_OFFSET_HOURS = 5; // Ташкент, UTC+5 (без перехода на летнее время)
const SEND_HOUR = 10; // отправляем после 10:00 по Ташкенту
const DAY = 24 * 3600 * 1000;

// Цепочка «ещё не заполнили»: порог в днях с момента добавления и минимальная
// пауза (в днях) после предыдущего напоминания этой цепочки.
const ONBOARDING_STEPS = [
  { afterDays: 2, gapDays: 0 },
  { afterDays: 5, gapDays: 3 },
  { afterDays: 12, gapDays: 7 },
  { afterDays: 19, gapDays: 7 },
  { afterDays: 26, gapDays: 7 },
];

type Mode = 'off' | 'test' | 'on';

interface Planned {
  clientId: string;
  telegramId: string;
  name: string;
  kind: string;
  dueKey: string;
  text: string;
}

/** Начало «ташкентских» суток для момента времени, в виде номера дня. */
const dayNumber = (d: Date) =>
  Math.floor((d.getTime() + TZ_OFFSET_HOURS * 3600 * 1000) / DAY);

const formatDate = (d: Date) =>
  new Date(d.getTime() + TZ_OFFSET_HOURS * 3600 * 1000).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });

/** Плюс один календарный месяц (31 января → 28/29 февраля). */
const addMonth = (d: Date) => {
  const r = new Date(d.getTime());
  const day = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + 1);
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r;
};

export const REMINDER_TEXTS = {
  onboarding: (name: string, step: number) =>
    step === 0
      ? `Здравствуйте, ${name}! 🌿 Это Елена. Чтобы я могла отслеживать ваш результат и вовремя корректировать программу, заполните, пожалуйста, анкету, сделайте первые замеры и загрузите фото. Это займёт 5–7 минут.`
      : step === 1
        ? `${name}, напоминаю про анкету и стартовые замеры. Мне важно видеть вашу точку «до» — без неё мы не сможем оценить прогресс. Давайте зафиксируем её сегодня 💚`
        : `${name}, ваш раздел «Мой прогресс» пока пуст. Заполните, пожалуйста, анкету, замеры и фото — тогда я смогу вести вас по результату, а не вслепую.`,
  monthlyPre: (name: string, date: string) =>
    `${name}, здравствуйте! Через 2 дня, ${date}, жду от вас новые замеры и фотоотчёт. Подготовьте сантиметровую ленту 📏`,
  monthlyDay: (name: string) =>
    `${name}, сегодня день замеров! Сделайте их утром натощак, добавьте фото и внесите всё в «Мой прогресс». Мне очень интересно, что изменилось за месяц 💪`,
  monthlyLate: (name: string) =>
    `${name}, я пока не вижу ваших замеров за этот месяц. Найдите, пожалуйста, 5 минут сегодня — регулярные отчёты помогают мне вести вас к результату 🌿`,
};

@Injectable()
export class ClientRemindersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClientRemindersService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private lastTestDay = -1;

  constructor(private prisma: PrismaService) {}

  private get mode(): Mode {
    const m = (process.env.CLIENT_REMINDERS || 'off').toLowerCase();
    return m === 'on' || m === 'test' ? m : 'off';
  }

  onModuleInit() {
    if (this.mode === 'off') {
      this.logger.log('Client reminders: off');
      return;
    }
    this.logger.log(`Client reminders: ${this.mode}`);
    // Проверяем раз в 10 минут; первая проверка — через минуту после старта
    this.timer = setInterval(() => void this.tick(), 10 * 60 * 1000);
    setTimeout(() => void this.tick(), 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    const now = new Date();
    const localHour = (now.getUTCHours() + TZ_OFFSET_HOURS) % 24;
    if (localHour < SEND_HOUR || localHour >= 21) return;
    this.running = true;
    try {
      await this.run(now);
    } catch (e) {
      this.logger.error(`Client reminders failed: ${(e as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /** Что нужно отправить сегодня (без учёта уже отправленного в журнале — он проверяется при отправке). */
  async plan(now: Date): Promise<Planned[]> {
    const today = dayNumber(now);
    const clients = await this.prisma.clientProfile.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: { select: { telegramId: true, firstName: true, tgStatus: true } },
        measurements: { orderBy: { date: 'desc' }, take: 1, select: { date: true } },
        reminders: { orderBy: { sentAt: 'desc' } },
      },
    });

    const out: Planned[] = [];
    for (const c of clients) {
      if (!c.user?.telegramId) continue;
      const name = (c.user.firstName || '').trim() || 'Здравствуйте';
      const base = { clientId: c.id, telegramId: c.user.telegramId, name };
      const last = c.measurements[0]?.date;

      if (!last) {
        // Цепочка «ещё не заполнили»
        const sent = c.reminders.filter((r) => r.kind === 'ONBOARDING');
        const step = sent.length;
        const cfg = ONBOARDING_STEPS[step];
        if (!cfg) continue; // все напоминания цепочки уже отправлены
        const daysAsClient = today - dayNumber(c.startedAt);
        const daysSincePrev = sent[0] ? today - dayNumber(sent[0].sentAt) : Infinity;
        if (daysAsClient >= cfg.afterDays && daysSincePrev >= cfg.gapDays) {
          out.push({
            ...base,
            kind: 'ONBOARDING',
            dueKey: String(step),
            text: REMINDER_TEXTS.onboarding(name, step),
          });
        }
        continue;
      }

      // Ежемесячный отчёт: срок — через месяц после последнего замера
      const due = addMonth(last);
      const dueKey = due.toISOString().slice(0, 10);
      const diff = today - dayNumber(due); // <0 — до срока, 0 — день срока
      const already = (kind: string) =>
        c.reminders.some((r) => r.kind === kind && r.dueKey === dueKey);

      if (diff >= -2 && diff < 0 && !already('MONTHLY_PRE')) {
        out.push({
          ...base,
          kind: 'MONTHLY_PRE',
          dueKey,
          text: REMINDER_TEXTS.monthlyPre(name, formatDate(due)),
        });
      } else if (diff >= 0 && diff < 2 && !already('MONTHLY_DAY')) {
        out.push({ ...base, kind: 'MONTHLY_DAY', dueKey, text: REMINDER_TEXTS.monthlyDay(name) });
      } else if (diff >= 2 && !already('MONTHLY_LATE')) {
        out.push({ ...base, kind: 'MONTHLY_LATE', dueKey, text: REMINDER_TEXTS.monthlyLate(name) });
      }
    }
    return out;
  }

  private async run(now: Date) {
    const mode = this.mode;
    if (mode === 'off') return;
    const planned = await this.plan(now);

    if (mode === 'test') {
      // Тест: один раз в день показываем владельцу, что ушло бы клиентам
      const today = dayNumber(now);
      if (this.lastTestDay === today) return;
      this.lastTestDay = today;
      await this.send(
        OWNER_TELEGRAM_ID,
        `🧪 Тест напоминаний клиентам: сегодня ушло бы сообщений — ${planned.length}. Клиентам ничего не отправлено.`,
        false,
      );
      for (const p of planned) {
        await this.send(OWNER_TELEGRAM_ID, `🧪 Кому: ${p.name} (${p.kind})\n\n${p.text}`, true);
        await new Promise((r) => setTimeout(r, 300));
      }
      return;
    }

    for (const p of planned) {
      // Сначала занимаем «слот» в журнале: уникальный индекс не даст отправить дважды
      let logId: string;
      try {
        const rec = await this.prisma.clientReminder.create({
          data: { clientId: p.clientId, kind: p.kind, dueKey: p.dueKey },
        });
        logId = rec.id;
      } catch {
        continue; // уже отправляли
      }
      const ok = await this.send(p.telegramId, p.text, true);
      if (!ok) {
        // Не дошло — освобождаем слот, попробуем в следующий заход
        await this.prisma.clientReminder.delete({ where: { id: logId } }).catch(() => {});
      } else {
        this.logger.log(`Reminder ${p.kind} (${p.dueKey}) sent to client ${p.clientId}`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  private async send(chatId: string, text: string, withButton: boolean): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return false;
    // TELEGRAM_APP_URL может содержать несколько адресов через запятую (для CORS) — берём первый
    const appUrl = (process.env.TELEGRAM_APP_URL || '').split(',')[0].trim().replace(/\/$/, '');
    const body: any = { chat_id: chatId, text };
    if (withButton && appUrl.startsWith('https://')) {
      body.reply_markup = {
        inline_keyboard: [[{ text: 'Открыть «Мой прогресс»', web_app: { url: `${appUrl}/progress` } }]],
      };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const json: any = await res.json();
      if (!json.ok) {
        this.logger.warn(`Reminder to ${chatId} failed: ${json.description || res.status}`);
        // 403 (бот заблокирован) / 400 chat not found — считаем «обработано», чтобы не повторять каждые 10 минут
        return (
          json.error_code === 403 ||
          (json.error_code === 400 && /chat not found|deactivated/i.test(json.description || ''))
        );
      }
      return true;
    } catch (e) {
      this.logger.warn(`Reminder to ${chatId} error: ${(e as Error).message}`);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
