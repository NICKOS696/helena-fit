import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateNewsDto {
  title: string;
  content: string;
  excerpt?: string;
  bannerImage?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: Date;
  workoutCollectionIds?: string[];
  recipeCollectionIds?: string[];
}

@Injectable()
export class AdminNewsService {
  constructor(private prisma: PrismaService) {}

  async getNews() {
    return this.prisma.news.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        workoutLinks: {
          include: {
            collection: {
              select: { id: true, title: true },
            },
          },
        },
        recipeLinks: {
          include: {
            collection: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });
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

  async createNews(data: CreateNewsDto) {
    const { workoutCollectionIds, recipeCollectionIds, ...newsData } = data;

    return this.prisma.news.create({
      data: {
        ...newsData,
        workoutLinks: workoutCollectionIds
          ? {
              create: workoutCollectionIds.map((collectionId) => ({
                collectionId,
              })),
            }
          : undefined,
        recipeLinks: recipeCollectionIds
          ? {
              create: recipeCollectionIds.map((collectionId) => ({
                collectionId,
              })),
            }
          : undefined,
      },
      include: {
        workoutLinks: true,
        recipeLinks: true,
      },
    });
  }

  async updateNews(id: string, data: Partial<CreateNewsDto>) {
    const { workoutCollectionIds, recipeCollectionIds, ...newsData } = data;

    await this.prisma.$transaction(async (tx) => {
      if (workoutCollectionIds !== undefined) {
        await tx.newsWorkoutLink.deleteMany({ where: { newsId: id } });
        if (workoutCollectionIds.length > 0) {
          await tx.newsWorkoutLink.createMany({
            data: workoutCollectionIds.map((collectionId) => ({
              newsId: id,
              collectionId,
            })),
          });
        }
      }

      if (recipeCollectionIds !== undefined) {
        await tx.newsRecipeLink.deleteMany({ where: { newsId: id } });
        if (recipeCollectionIds.length > 0) {
          await tx.newsRecipeLink.createMany({
            data: recipeCollectionIds.map((collectionId) => ({
              newsId: id,
              collectionId,
            })),
          });
        }
      }

      await tx.news.update({
        where: { id },
        data: newsData,
      });
    });

    return this.getNewsById(id);
  }

  async deleteNews(id: string) {
    await this.prisma.news.delete({ where: { id } });
    return { success: true };
  }
}
