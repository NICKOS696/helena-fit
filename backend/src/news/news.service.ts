import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Telegram ID, которым видны черновики новостей (для предпросмотра).
const PREVIEW_TELEGRAM_IDS = ['89761488', '449178486'];

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService) {}

  private isPreviewer(telegramId?: string): boolean {
    return !!telegramId && PREVIEW_TELEGRAM_IDS.includes(telegramId);
  }

  async getNews(page = 1, limit = 10, telegramId?: string) {
    const skip = (page - 1) * limit;
    const preview = this.isPreviewer(telegramId);
    // Превьюверам показываем и черновики; остальным — только опубликованное
    const where = preview
      ? { status: { in: ['PUBLISHED', 'DRAFT'] as any } }
      : { status: 'PUBLISHED' as any };
    const orderBy = preview
      ? ({ createdAt: 'desc' } as any) // у черновиков publishedAt пустой
      : ({ publishedAt: 'desc' } as any);

    const [items, total] = await Promise.all([
      this.prisma.news.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          workoutLinks: {
            include: {
              collection: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          recipeLinks: {
            include: {
              collection: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.news.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getNewsById(id: string, telegramId?: string) {
    const news = await this.prisma.news.findUnique({
      where: { id },
      include: {
        workoutLinks: {
          include: {
            collection: true,
          },
        },
        recipeLinks: {
          include: {
            collection: true,
          },
        },
      },
    });
    // Черновик/архив доступен только превьюверам
    if (news && news.status !== 'PUBLISHED' && !this.isPreviewer(telegramId)) {
      return null;
    }
    return news;
  }
}
