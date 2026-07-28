import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentType } from './dto/track-view.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Записать просмотр контента
   */
  async trackView(userId: string, itemType: ContentType, itemId: string) {
    return this.prisma.contentView.create({
      data: {
        userId,
        itemType,
        itemId,
      },
    });
  }

  /**
   * Получить статистику по коллекциям (тренировки и рецепты)
   */
  async getCollectionStats() {
    const stats = await this.prisma.contentView.groupBy({
      by: ['itemId', 'itemType'],
      where: {
        itemType: {
          in: ['WORKOUT_COLLECTION', 'RECIPE_COLLECTION'],
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 50,
    });

    return this.enrichStats(stats);
  }

  /**
   * Получить статистику по отдельным рецептам
   */
  async getRecipeStats() {
    const stats = await this.prisma.contentView.groupBy({
      by: ['itemId', 'itemType'],
      where: {
        itemType: 'RECIPE',
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 50,
    });

    return this.enrichStats(stats);
  }

  /**
   * Получить статистику по типу контента
   */
  async getContentStats(itemType?: ContentType) {
    const where = itemType ? { itemType } : {};

    const stats = await this.prisma.contentView.groupBy({
      by: ['itemId', 'itemType'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 50,
    });

    return this.enrichStats(stats);
  }

  /**
   * Определить название и обложку контента по его типу и id.
   * Возвращает null, если контент не найден (удалён).
   */
  private async resolveContentMeta(
    itemType: string,
    itemId: string,
  ): Promise<{ title: string; coverImage: string | null } | null> {
    try {
      if (itemType === 'WORKOUT_COLLECTION') {
        const c = await this.prisma.workoutCollection.findUnique({
          where: { id: itemId },
          select: { title: true, coverImage: true },
        });
        return c ? { title: c.title, coverImage: c.coverImage } : null;
      } else if (itemType === 'RECIPE_COLLECTION') {
        const c = await this.prisma.recipeCollection.findUnique({
          where: { id: itemId },
          select: { title: true, coverImage: true },
        });
        return c ? { title: c.title, coverImage: c.coverImage } : null;
      } else if (itemType === 'RECIPE') {
        const r = await this.prisma.recipe.findUnique({
          where: { id: itemId },
          select: { title: true, coverImage: true },
        });
        return r ? { title: r.title, coverImage: r.coverImage } : null;
      } else if (itemType === 'WORKOUT') {
        const w = await this.prisma.workout.findUnique({
          where: { id: itemId },
          select: { title: true, coverImage: true },
        });
        return w ? { title: w.title, coverImage: w.coverImage } : null;
      } else if (itemType === 'NEWS') {
        const n = await this.prisma.news.findUnique({
          where: { id: itemId },
          select: { title: true, bannerImage: true },
        });
        return n ? { title: n.title, coverImage: n.bannerImage } : null;
      } else if (itemType === 'BROADCAST') {
        const b = await this.prisma.broadcast.findUnique({
          where: { id: itemId },
          select: { message: true },
        });
        return b
          ? {
              title: `Переход по рассылке: «${b.message.slice(0, 60)}${b.message.length > 60 ? '…' : ''}»`,
              coverImage: null,
            }
          : null;
      } else if (itemType === 'AD') {
        // itemId — метка рекламной кампании из ?startapp=
        return { title: `Переход по рекламе: «${itemId}»`, coverImage: null };
      }
    } catch (error) {
      console.error('Error fetching content details:', error);
    }
    return null;
  }

  /**
   * Обогащение статистики деталями контента
   */
  private async enrichStats(stats: any[]) {
    const enrichedStats = await Promise.all(
      stats.map(async (stat) => {
        const meta = await this.resolveContentMeta(stat.itemType, stat.itemId);
        return {
          itemId: stat.itemId,
          itemType: stat.itemType,
          title: meta?.title ?? 'Unknown',
          coverImage: meta?.coverImage ?? null,
          views: stat._count.id,
        };
      }),
    );

    // Фильтруем записи с Unknown (удалённый контент)
    return enrichedStats.filter((stat) => stat.title !== 'Unknown');
  }

  /**
   * Что именно открывал конкретный пользователь:
   * список контента с количеством просмотров и датой последнего открытия.
   */
  async getUserViews(userId: string) {
    const grouped = await this.prisma.contentView.groupBy({
      by: ['itemId', 'itemType'],
      where: { userId },
      _count: { id: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
      take: 200,
    });

    const enriched = await Promise.all(
      grouped.map(async (g) => {
        const meta = await this.resolveContentMeta(g.itemType, g.itemId);
        return {
          itemId: g.itemId,
          itemType: g.itemType,
          title: meta?.title ?? 'Удалённый контент',
          coverImage: meta?.coverImage ?? null,
          views: g._count.id,
          lastViewedAt: g._max.createdAt,
        };
      }),
    );

    // Сортируем по дате последнего просмотра — сверху самое свежее
    return enriched.sort(
      (a, b) =>
        new Date(b.lastViewedAt as any).getTime() - new Date(a.lastViewedAt as any).getTime(),
    );
  }

  /**
   * Получить общую статистику
   */
  async getOverallStats() {
    const [totalViews, totalUsers, recentViews] = await Promise.all([
      // Всего просмотров
      this.prisma.contentView.count(),
      
      // Уникальных пользователей
      this.prisma.contentView.findMany({
        distinct: ['userId'],
        select: { userId: true },
      }),
      
      // Просмотры за последние 7 дней
      this.prisma.contentView.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        _count: {
          id: true,
        },
      }),
    ]);

    // Группируем просмотры по дням
    const viewsByDay = recentViews.reduce((acc, view) => {
      const date = view.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + view._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalViews,
      uniqueUsers: totalUsers.length,
      viewsByDay,
    };
  }

  /**
   * Получить активность пользователей
   */
  async getUserActivity() {
    const activity = await this.prisma.contentView.groupBy({
      by: ['userId'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 20,
    });

    // Получаем данные пользователей
    const enrichedActivity = await Promise.all(
      activity.map(async (item) => {
        const user = await this.prisma.user.findUnique({
          where: { id: item.userId },
          select: {
            firstName: true,
            lastName: true,
            username: true,
            photoUrl: true,
          },
        });

        return {
          userId: item.userId,
          user,
          views: item._count.id,
        };
      })
    );

    return enrichedActivity;
  }

  // День запуска: покупки считаем начиная с 16.06.2026 (00:00 по Ташкенту, UTC+5).
  // Раньше этой даты — тестовые транзакции, их не показываем.
  private static readonly LAUNCH_DATE = new Date('2026-06-16T00:00:00+05:00');

  /**
   * Покупки: кто, что и когда купил (завершённые транзакции с дня запуска).
   */
  async getPurchases() {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        status: 'COMPLETED',
        type: 'PURCHASE',
        createdAt: { gte: AnalyticsService.LAUNCH_DATE },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
            telegramId: true,
            photoUrl: true,
          },
        },
      },
    });

    const txPurchases = await Promise.all(
      transactions.map(async (t) => {
        const meta = await this.resolveContentMeta(t.itemType, t.itemId);
        return {
          id: t.id,
          user: t.user,
          itemType: t.itemType,
          title: meta?.title ?? 'Удалённый контент',
          coverImage: meta?.coverImage ?? null,
          amount: t.amount,
          paymentMethod: t.paymentMethod,
          createdAt: t.createdAt,
          manual: false,
        };
      }),
    );

    // Ручные (рублёвые) оплаты — добавляем в тот же список
    const manuals = await this.prisma.manualPayment.findMany({
      orderBy: { paidAt: 'desc' },
      take: 500,
    });
    const manualPurchases = await Promise.all(
      manuals.map(async (m) => {
        const meta = await this.resolveContentMeta(m.collectionType, m.collectionId);
        let user: any = null;
        if (m.telegramId) {
          user = await this.prisma.user.findUnique({
            where: { telegramId: m.telegramId },
            select: {
              firstName: true,
              lastName: true,
              username: true,
              telegramId: true,
              photoUrl: true,
            },
          });
          if (!user) user = { firstName: `ID ${m.telegramId}`, telegramId: m.telegramId };
        }
        return {
          id: m.id,
          user,
          itemType: m.collectionType,
          title: meta?.title ?? 'Удалённый контент',
          coverImage: meta?.coverImage ?? null,
          amount: m.amount,
          paymentMethod: 'RUBLE',
          createdAt: m.paidAt,
          manual: true,
          note: m.note,
        };
      }),
    );

    const purchases = [...txPurchases, ...manualPurchases].sort(
      (a, b) =>
        new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime(),
    );

    const totalRevenue = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Разбивка выручки за сегодня / неделю / месяц.
    const now = new Date();
    // Начало сегодняшнего дня по Ташкенту (UTC+5), выраженное в UTC
    const tashkent = new Date(now.getTime() + 5 * 3600 * 1000);
    const startOfToday = new Date(
      Date.UTC(tashkent.getUTCFullYear(), tashkent.getUTCMonth(), tashkent.getUTCDate()) -
        5 * 3600 * 1000,
    );
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const launch = AnalyticsService.LAUNCH_DATE;
    // Не считаем раньше дня запуска (тестовые транзакции)
    const clamp = (d: Date) => (d < launch ? launch : d);

    const [today, week, month] = await Promise.all([
      this.revenueSince(clamp(startOfToday)),
      this.revenueSince(clamp(weekAgo)),
      this.revenueSince(clamp(monthAgo)),
    ]);

    return {
      purchases,
      totalRevenue,
      count: purchases.length,
      breakdown: { today, week, month },
    };
  }

  /**
   * Сумма выручки и число покупок начиная с даты.
   * Учитываются завершённые Payme-покупки + ручные (рублёвые) оплаты.
   */
  private async revenueSince(date: Date) {
    const [tx, manual] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          type: 'PURCHASE',
          createdAt: { gte: date },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.manualPayment.aggregate({
        where: { paidAt: { gte: date } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);
    return {
      revenue: (tx._sum.amount || 0) + (manual._sum.amount || 0),
      count: tx._count._all + manual._count._all,
    };
  }

  /**
   * Записать ручную (рублёвую) оплату — попадёт в общий доход.
   */
  async createManualPayment(dto: {
    collectionId: string;
    collectionType: 'WORKOUT_COLLECTION' | 'RECIPE_COLLECTION';
    amount: number;
    telegramId?: string;
    note?: string;
    paidAt?: string;
  }) {
    return this.prisma.manualPayment.create({
      data: {
        collectionId: dto.collectionId,
        collectionType: dto.collectionType as any,
        amount: dto.amount,
        telegramId: dto.telegramId || null,
        note: dto.note || null,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
      },
    });
  }

  /**
   * Список ручных оплат (для управления в админке).
   */
  async listManualPayments() {
    const items = await this.prisma.manualPayment.findMany({
      orderBy: { paidAt: 'desc' },
      take: 500,
    });
    return Promise.all(
      items.map(async (m) => {
        const meta = await this.resolveContentMeta(m.collectionType, m.collectionId);
        let userName: string | null = null;
        if (m.telegramId) {
          const u = await this.prisma.user.findUnique({
            where: { telegramId: m.telegramId },
            select: { firstName: true, lastName: true },
          });
          userName = u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : null;
        }
        return {
          id: m.id,
          collectionType: m.collectionType,
          title: meta?.title ?? 'Удалённый сборник',
          amount: m.amount,
          telegramId: m.telegramId,
          userName,
          note: m.note,
          paidAt: m.paidAt,
        };
      }),
    );
  }

  /** Удалить ручную оплату (если ошибочно внесена). */
  async deleteManualPayment(id: string) {
    await this.prisma.manualPayment.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Посещаемость: уникальные пользователи по дням (30 дней, дни по Ташкенту),
   * тренд последних 7 дней к предыдущим 7, активные без единого доступа.
   */
  async getEngagement() {
    const TZ_MS = 5 * 3600 * 1000;
    const now = Date.now();
    const since30 = new Date(now - 30 * 24 * 3600 * 1000);

    const views = await this.prisma.contentView.findMany({
      where: { createdAt: { gte: since30 } },
      select: { userId: true, createdAt: true },
    });

    // Уникальные посетители по дням
    const byDayMap = new Map<string, Set<string>>();
    for (const v of views) {
      const day = new Date(v.createdAt.getTime() + TZ_MS).toISOString().slice(0, 10);
      if (!byDayMap.has(day)) byDayMap.set(day, new Set());
      byDayMap.get(day)!.add(v.userId);
    }
    // Полные 30 дней, включая пустые
    const byDay: { date: string; users: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now + TZ_MS - i * 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10);
      byDay.push({ date: day, users: byDayMap.get(day)?.size || 0 });
    }

    // Тренд: уникальные за последние 7 дней vs предыдущие 7
    const uniq = (from: number, to: number) => {
      const s = new Set<string>();
      for (const v of views) {
        const t = v.createdAt.getTime();
        if (t >= from && t < to) s.add(v.userId);
      }
      return s;
    };
    const last7Set = uniq(now - 7 * 24 * 3600 * 1000, now);
    const prev7Set = uniq(now - 14 * 24 * 3600 * 1000, now - 7 * 24 * 3600 * 1000);
    const last7 = last7Set.size;
    const prev7 = prev7Set.size;
    const trendPct = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null;

    // Активные за 7 дней без единого доступа (тёплая аудитория без покупок)
    const activeIds = [...last7Set];
    let activeNoAccess = 0;
    if (activeIds.length > 0) {
      const [wAcc, rAcc] = await Promise.all([
        this.prisma.workoutCollectionAccess.findMany({
          where: { userId: { in: activeIds } },
          select: { userId: true },
        }),
        this.prisma.recipeCollectionAccess.findMany({
          where: { userId: { in: activeIds } },
          select: { userId: true },
        }),
      ]);
      const withAccess = new Set([
        ...wAcc.map((a) => a.userId),
        ...rAcc.map((a) => a.userId),
      ]);
      activeNoAccess = activeIds.filter((id) => !withAccess.has(id)).length;
    }

    return { byDay, last7, prev7, trendPct, activeNoAccess };
  }

  /**
   * Журнал рассылок с переходами по кнопке (клики считаются по метке ?bc=).
   */
  async getBroadcasts() {
    const broadcasts = await this.prisma.broadcast.findMany({
      orderBy: { sentAt: 'desc' },
      take: 20,
    });
    const result = [];
    for (const b of broadcasts) {
      // Уникальные пользователи, открывшие приложение по кнопке этой рассылки
      const clicks = await this.prisma.contentView.groupBy({
        by: ['userId'],
        where: { itemType: 'BROADCAST' as any, itemId: b.id },
      });
      result.push({
        id: b.id,
        message: b.message,
        buttonText: b.buttonText,
        sentAt: b.sentAt,
        total: b.total,
        sent: b.sent,
        blocked: b.blocked,
        clicks: clicks.length,
        ctr: b.sent > 0 ? Math.round((clicks.length / b.sent) * 1000) / 10 : null,
        hasButton: !!b.buttonUrl,
      });
    }
    return result;
  }

  /**
   * Переходы по рекламе (метки ?startapp= из объявлений):
   * по каждой метке — уникальные люди, всего открытий, первый/последний переход.
   */
  async getAds() {
    const views = await this.prisma.contentView.findMany({
      where: { itemType: 'AD' as any },
      select: { itemId: true, userId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const byLabel = new Map<
      string,
      { users: Set<string>; total: number; firstAt: Date; lastAt: Date }
    >();
    for (const v of views) {
      const rec = byLabel.get(v.itemId) || {
        users: new Set<string>(),
        total: 0,
        firstAt: v.createdAt,
        lastAt: v.createdAt,
      };
      rec.users.add(v.userId);
      rec.total += 1;
      rec.lastAt = v.createdAt;
      byLabel.set(v.itemId, rec);
    }
    return Array.from(byLabel.entries())
      .map(([label, r]) => ({
        label,
        uniqueUsers: r.users.size,
        total: r.total,
        firstAt: r.firstAt,
        lastAt: r.lastAt,
      }))
      .sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));
  }

  /**
   * Продажи с фильтрами для аналитики: период (даты по Ташкенту, UTC+5) и сборник.
   * Объединяет Payme-покупки и ручные (рублёвые) оплаты; отдаёт список,
   * итоги, разбивку по сборникам и по дням.
   */
  async getSales(fromStr?: string, toStr?: string, collectionId?: string) {
    const TZ_MS = 5 * 3600 * 1000;
    // from: начало дня по Ташкенту; по умолчанию — день запуска
    const from = fromStr
      ? new Date(new Date(`${fromStr}T00:00:00Z`).getTime() - TZ_MS)
      : AnalyticsService.LAUNCH_DATE;
    // to: конец дня по Ташкенту (исключающая граница — полночь следующего дня)
    const to = toStr
      ? new Date(new Date(`${toStr}T00:00:00Z`).getTime() - TZ_MS + 24 * 3600 * 1000)
      : new Date();

    const txWhere: any = {
      status: 'COMPLETED',
      type: 'PURCHASE',
      createdAt: { gte: from, lt: to },
    };
    if (collectionId) txWhere.itemId = collectionId;

    const mWhere: any = { paidAt: { gte: from, lt: to } };
    if (collectionId) mWhere.collectionId = collectionId;

    const [transactions, manuals] = await Promise.all([
      this.prisma.transaction.findMany({
        where: txWhere,
        orderBy: { createdAt: 'desc' },
        take: 1000,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              username: true,
              telegramId: true,
            },
          },
        },
      }),
      this.prisma.manualPayment.findMany({
        where: mWhere,
        orderBy: { paidAt: 'desc' },
        take: 1000,
      }),
    ]);

    // Названия/обложки сборников — по одному запросу на уникальный id
    const metaCache = new Map<string, { title: string; coverImage: string | null } | null>();
    const getMeta = async (itemType: string, itemId: string) => {
      const key = `${itemType}:${itemId}`;
      if (!metaCache.has(key)) {
        metaCache.set(key, await this.resolveContentMeta(itemType, itemId));
      }
      return metaCache.get(key);
    };

    const rows: any[] = [];
    for (const t of transactions) {
      const meta = await getMeta(t.itemType, t.itemId);
      rows.push({
        id: t.id,
        itemId: t.itemId,
        itemType: t.itemType,
        title: meta?.title ?? 'Удалённый контент',
        coverImage: meta?.coverImage ?? null,
        amount: t.amount,
        user: t.user,
        createdAt: t.createdAt,
        manual: false,
      });
    }
    for (const m of manuals) {
      const meta = await getMeta(m.collectionType, m.collectionId);
      let user: any = null;
      if (m.telegramId) {
        user = await this.prisma.user.findUnique({
          where: { telegramId: m.telegramId },
          select: { firstName: true, lastName: true, username: true, telegramId: true },
        });
        if (!user) user = { firstName: `ID ${m.telegramId}`, telegramId: m.telegramId };
      }
      rows.push({
        id: m.id,
        itemId: m.collectionId,
        itemType: m.collectionType,
        title: meta?.title ?? 'Удалённый сборник',
        coverImage: meta?.coverImage ?? null,
        amount: m.amount,
        user,
        createdAt: m.paidAt,
        manual: true,
        note: m.note,
      });
    }

    rows.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const totalRevenue = rows.reduce((s, r) => s + (r.amount || 0), 0);

    // Разбивка по сборникам
    const byCollectionMap = new Map<string, any>();
    for (const r of rows) {
      const key = r.itemId;
      const acc = byCollectionMap.get(key) || {
        collectionId: r.itemId,
        itemType: r.itemType,
        title: r.title,
        coverImage: r.coverImage,
        revenue: 0,
        count: 0,
      };
      acc.revenue += r.amount || 0;
      acc.count += 1;
      byCollectionMap.set(key, acc);
    }
    const byCollection = [...byCollectionMap.values()].sort(
      (a, b) => b.revenue - a.revenue,
    );

    // Разбивка по дням (дата по Ташкенту)
    const byDayMap = new Map<string, { revenue: number; count: number }>();
    for (const r of rows) {
      const day = new Date(new Date(r.createdAt).getTime() + TZ_MS)
        .toISOString()
        .slice(0, 10);
      const acc = byDayMap.get(day) || { revenue: 0, count: 0 };
      acc.revenue += r.amount || 0;
      acc.count += 1;
      byDayMap.set(day, acc);
    }
    const byDay = [...byDayMap.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      purchases: rows,
      totalRevenue,
      count: rows.length,
      avgCheck: rows.length ? Math.round(totalRevenue / rows.length) : 0,
      byCollection,
      byDay,
    };
  }
}
