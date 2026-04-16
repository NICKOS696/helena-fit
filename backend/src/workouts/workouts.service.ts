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
        price: true,
        discount: true,
        discountType: true,
        discountEndDate: true,
        _count: {
          select: { workouts: true },
        },
      },
    });

    if (!userId) {
      return collections.map((c) => ({
        ...c,
        workoutCount: c._count.workouts,
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
      workoutCount: c._count.workouts,
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
        ? collection.workouts
        : collection.workouts.map((w) => ({
            id: w.id,
            title: w.title,
            description: w.description,
            coverImage: w.coverImage,
            calories: w.calories,
            duration: w.duration,
            locked: true,
          })),
    };
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
