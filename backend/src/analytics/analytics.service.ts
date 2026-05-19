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
   * Обогащение статистики деталями контента
   */
  private async enrichStats(stats: any[]) {
    const enrichedStats = await Promise.all(
      stats.map(async (stat) => {
        let title = 'Unknown';
        let coverImage = null;

        try {
          if (stat.itemType === 'WORKOUT_COLLECTION') {
            const collection = await this.prisma.workoutCollection.findUnique({
              where: { id: stat.itemId },
              select: { title: true, coverImage: true },
            });
            if (collection) {
              title = collection.title;
              coverImage = collection.coverImage;
            }
          } else if (stat.itemType === 'RECIPE_COLLECTION') {
            const collection = await this.prisma.recipeCollection.findUnique({
              where: { id: stat.itemId },
              select: { title: true, coverImage: true },
            });
            if (collection) {
              title = collection.title;
              coverImage = collection.coverImage;
            }
          } else if (stat.itemType === 'RECIPE') {
            const recipe = await this.prisma.recipe.findUnique({
              where: { id: stat.itemId },
              select: { title: true, coverImage: true },
            });
            if (recipe) {
              title = recipe.title;
              coverImage = recipe.coverImage;
            }
          } else if (stat.itemType === 'WORKOUT') {
            const workout = await this.prisma.workout.findUnique({
              where: { id: stat.itemId },
              select: { title: true, coverImage: true },
            });
            if (workout) {
              title = workout.title;
              coverImage = workout.coverImage;
            }
          } else if (stat.itemType === 'NEWS') {
            const news = await this.prisma.news.findUnique({
              where: { id: stat.itemId },
              select: { title: true, bannerImage: true },
            });
            if (news) {
              title = news.title;
              coverImage = news.bannerImage;
            }
          }
        } catch (error) {
          console.error('Error fetching content details:', error);
        }

        return {
          itemId: stat.itemId,
          itemType: stat.itemType,
          title,
          coverImage,
          views: stat._count.id,
        };
      })
    );

    // Фильтруем записи с Unknown (удалённый контент)
    return enrichedStats.filter(stat => stat.title !== 'Unknown');
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
