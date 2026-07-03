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
}
