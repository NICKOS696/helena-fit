import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Те же превью-ID, что и в RecipesService — им отдаём полный контент для предпросмотра.
const PREVIEW_TELEGRAM_IDS = ['89761488', '449178486'];

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
   * Получить все избранные рецепты пользователя.
   * Полный контент (ингредиенты/инструкции/КБЖУ) отдаём только для рецептов,
   * к сборнику которых есть доступ; остальным — превью (как в RecipesService.getRecipe).
   */
  async getFavorites(userId: string, telegramId?: string) {
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

    // Сборники, к которым у пользователя реально есть доступ
    const access = await this.prisma.recipeCollectionAccess.findMany({
      where: { userId },
      select: { collectionId: true },
    });
    const accessIds = new Set(access.map((a) => a.collectionId));
    const isPreviewer = !!telegramId && PREVIEW_TELEGRAM_IDS.includes(telegramId);

    return favorites.map((fav) => {
      const recipe = fav.recipe;
      const hasAccess = isPreviewer || accessIds.has(recipe.collectionId);

      if (!hasAccess) {
        // Превью — без ингредиентов, инструкций и КБЖУ
        return {
          id: recipe.id,
          collectionId: recipe.collectionId,
          title: recipe.title,
          description: recipe.description,
          coverImage: recipe.coverImage,
          coverImageFit: recipe.coverImageFit,
          coverImagePosition: recipe.coverImagePosition,
          category: recipe.category,
          cookingTime: recipe.cookingTime,
          locked: true,
          isFavorite: true,
          collectionTitle: recipe.collection.title,
        };
      }

      return {
        ...recipe,
        locked: false,
        isFavorite: true,
        collectionTitle: recipe.collection.title,
      };
    });
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
