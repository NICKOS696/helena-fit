import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Добавить рецепт в избранное
   */
  async addToFavorites(userId: string, recipeId: string) {
    return this.prisma.favoriteRecipe.create({
      data: {
        userId,
        recipeId,
      },
    });
  }

  /**
   * Удалить рецепт из избранного
   */
  async removeFromFavorites(userId: string, recipeId: string) {
    return this.prisma.favoriteRecipe.deleteMany({
      where: {
        userId,
        recipeId,
      },
    });
  }

  /**
   * Получить все избранные рецепты пользователя
   */
  async getFavorites(userId: string) {
    const favorites = await this.prisma.favoriteRecipe.findMany({
      where: { userId },
      include: {
        recipe: {
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
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((fav) => ({
      ...fav.recipe,
      collectionTitle: fav.recipe.collection.title,
    }));
  }

  /**
   * Проверить, находится ли рецепт в избранном
   */
  async isFavorite(userId: string, recipeId: string): Promise<boolean> {
    const favorite = await this.prisma.favoriteRecipe.findFirst({
      where: {
        userId,
        recipeId,
      },
    });

    return !!favorite;
  }

  /**
   * Получить ID всех избранных рецептов пользователя
   */
  async getFavoriteIds(userId: string): Promise<string[]> {
    const favorites = await this.prisma.favoriteRecipe.findMany({
      where: { userId },
      select: { recipeId: true },
    });

    return favorites.map((fav) => fav.recipeId);
  }
}
