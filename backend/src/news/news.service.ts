import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService) {}

  async getNews(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.news.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
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
      this.prisma.news.count({
        where: { status: 'PUBLISHED' },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getNewsById(id: string) {
    return this.prisma.news.findUnique({
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
  }
}
