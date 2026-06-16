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
}
