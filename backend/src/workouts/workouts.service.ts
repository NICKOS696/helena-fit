import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkoutsService {
  constructor(private prisma: PrismaService) {}

  async getCollections(userId?: string) {
    const collections = await this.prisma.workoutCollection.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        coverImageFit: true,
        coverImagePosition: true,
        price: true,
        discount: true,
        discountType: true,
        discountEndDate: true,
        isInDevelopment: true,
        sections: {
          select: {
            items: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!userId) {
      return collections.map((c) => ({
        ...c,
        workoutCount: c.sections.reduce((total, section) => total + section.items.length, 0),
        sections: undefined, // Убираем sections из ответа
        hasAccess: false,
      }));
    }

    const userAccess = await this.prisma.workoutCollectionAccess.findMany({
      where: { userId },
      select: { collectionId: true },
    });

    const accessIds = new Set(userAccess.map((a) => a.collectionId));

    return collections.map((c) => ({
      ...c,
      workoutCount: c.sections.reduce((total, section) => total + section.items.length, 0),
      sections: undefined, // Убираем sections из ответа
      hasAccess: accessIds.has(c.id),
      finalPrice: this.calculateFinalPrice(c.price, c.discount, c.discountType, c.discountEndDate),
    }));
  }

  async getCollection(id: string, userId?: string) {
    const collection = await this.prisma.workoutCollection.findUnique({
      where: { id },
      include: {
        workouts: {
          orderBy: { order: 'asc' },
        },
        sections: {
          include: {
            items: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!collection) {
      throw new ForbiddenException('Collection not found');
    }

    let hasAccess = false;
    if (userId) {
      const access = await this.prisma.workoutCollectionAccess.findUnique({
        where: {
          userId_collectionId: {
            userId,
            collectionId: id,
          },
        },
      });
      hasAccess = !!access;
    }

    // Отметки «выполнено» текущего пользователя (только при доступе)
    let completedIds = new Set<string>();
    if (userId && hasAccess) {
      const itemIds = [
        ...collection.workouts.map((w) => w.id),
        ...collection.sections.flatMap((s) => s.items.map((i) => i.id)),
      ];
      if (itemIds.length > 0) {
        const progress = await this.prisma.workoutProgress.findMany({
          where: { userId, itemId: { in: itemIds } },
          select: { itemId: true },
        });
        completedIds = new Set(progress.map((p) => p.itemId));
      }
    }

    return {
      ...collection,
      hasAccess,
      finalPrice: this.calculateFinalPrice(
        collection.price,
        collection.discount,
        collection.discountType,
        collection.discountEndDate,
      ),
      workouts: hasAccess
        ? collection.workouts.map((w) => ({
            ...w,
            completed: completedIds.has(w.id),
          }))
        : collection.workouts.map((w) => ({
            id: w.id,
            title: w.title,
            description: w.description,
            coverImage: w.coverImage,
            calories: w.calories,
            duration: w.duration,
            locked: true,
          })),
      // Без доступа отдаём структуру секций, но вырезаем платный контент
      // (rutubeUrl видео и текстовый content), оставляя только превью.
      sections: hasAccess
        ? collection.sections.map((s) => ({
            ...s,
            items: s.items.map((i) => ({
              ...i,
              completed: completedIds.has(i.id),
            })),
          }))
        : collection.sections.map((s) => ({
            id: s.id,
            collectionId: s.collectionId,
            title: s.title,
            description: s.description,
            type: s.type,
            order: s.order,
            items: s.items.map((i) => ({
              id: i.id,
              sectionId: i.sectionId,
              title: i.title,
              description: i.description,
              coverImage: i.coverImage,
              calories: i.calories,
              duration: i.duration,
              order: i.order,
              locked: true,
            })),
          })),
    };
  }

  // Переключает отметку «выполнено» у тренировки для пользователя.
  async toggleProgress(userId: string, itemId: string) {
    const existing = await this.prisma.workoutProgress.findUnique({
      where: { userId_itemId: { userId, itemId } },
    });

    if (existing) {
      await this.prisma.workoutProgress.delete({ where: { id: existing.id } });
      return { completed: false };
    }

    await this.prisma.workoutProgress.create({ data: { userId, itemId } });
    return { completed: true };
  }

  private calculateFinalPrice(
    price: number,
    discount: number,
    discountType: string,
    discountEndDate: Date,
  ): number {
    if (!discount || (discountEndDate && new Date() > discountEndDate)) {
      return price;
    }

    if (discountType === 'PERCENTAGE') {
      return Math.round(price * (1 - discount / 100));
    } else {
      return Math.max(0, price - discount);
    }
  }
}
