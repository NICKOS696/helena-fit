import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecipesService {
  constructor(private prisma: PrismaService) {}

  async getCollections(userId?: string) {
    const collections = await this.prisma.recipeCollection.findMany({
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
        isInDevelopment: true,
        _count: {
          select: { recipes: true },
        },
      },
    });

    if (!userId) {
      return collections.map((c) => ({
        ...c,
        recipeCount: c._count.recipes,
        hasAccess: false,
        finalPrice: this.calculateFinalPrice(c.price, c.discount, c.discountType, c.discountEndDate),
      }));
    }

    const userAccess = await this.prisma.recipeCollectionAccess.findMany({
      where: { userId },
      select: { collectionId: true },
    });

    const accessIds = new Set(userAccess.map((a) => a.collectionId));

    return collections.map((c) => ({
      ...c,
      recipeCount: c._count.recipes,
      hasAccess: accessIds.has(c.id),
      finalPrice: this.calculateFinalPrice(c.price, c.discount, c.discountType, c.discountEndDate),
    }));
  }

  async getCollection(id: string, userId?: string, category?: string) {
    const collection = await this.prisma.recipeCollection.findUnique({
      where: { id },
      include: {
        recipes: {
          where: category ? { category: category as any } : {},
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!collection) {
      throw new ForbiddenException('Collection not found');
    }

    let hasAccess = false;
    let favoriteIds: Set<string> = new Set();
    
    if (userId) {
      const access = await this.prisma.recipeCollectionAccess.findUnique({
        where: {
          userId_collectionId: {
            userId,
            collectionId: id,
          },
        },
      });
      hasAccess = !!access;

      // Получаем избранные рецепты
      const favorites = await this.prisma.favoriteRecipe.findMany({
        where: { userId },
        select: { recipeId: true },
      });
      favoriteIds = new Set(favorites.map((f) => f.recipeId));
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
      recipes: hasAccess
        ? collection.recipes.map((r) => ({
            ...r,
            isFavorite: favoriteIds.has(r.id),
          }))
        : collection.recipes.map((r) => ({
            id: r.id,
            title: r.title,
            coverImage: r.coverImage,
            category: r.category,
            cookingTime: r.cookingTime,
            locked: true,
            isFavorite: false,
          })),
    };
  }

  async getRecipe(collectionId: string, recipeId: string, userId?: string) {
    let hasAccess = false;
    let isFavorite = false;
    
    if (userId) {
      const access = await this.prisma.recipeCollectionAccess.findUnique({
        where: {
          userId_collectionId: {
            userId,
            collectionId,
          },
        },
      });
      hasAccess = !!access;

      // Проверяем избранное
      const favorite = await this.prisma.favoriteRecipe.findFirst({
        where: {
          userId,
          recipeId,
        },
      });
      isFavorite = !!favorite;
    }

    // Для тестирования разрешаем просмотр, но помечаем как locked
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe) {
      throw new ForbiddenException('Recipe not found');
    }

    return {
      ...recipe,
      locked: !hasAccess,
      isFavorite,
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
