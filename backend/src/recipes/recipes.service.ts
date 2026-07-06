import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Telegram ID, которым можно открывать сборники «в разработке» для предпросмотра.
// Остальные пользователи видят такие сборники как «Скоро будет доступно».
const PREVIEW_TELEGRAM_IDS = ['89761488', '449178486'];

@Injectable()
export class RecipesService {
  constructor(private prisma: PrismaService) {}

  private isPreviewer(telegramId?: string): boolean {
    return !!telegramId && PREVIEW_TELEGRAM_IDS.includes(telegramId);
  }

  async getCollections(userId?: string, telegramId?: string) {
    const collections = await this.prisma.recipeCollection.findMany({
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
    const preview = this.isPreviewer(telegramId);

    return collections.map((c) => ({
      ...c,
      recipeCount: c._count.recipes,
      // Для предпросмотра скрываем статус «в разработке» и открываем сборник
      isInDevelopment: preview && c.isInDevelopment ? false : c.isInDevelopment,
      hasAccess: accessIds.has(c.id) || (preview && c.isInDevelopment),
      finalPrice: this.calculateFinalPrice(c.price, c.discount, c.discountType, c.discountEndDate),
    }));
  }

  async getCollection(id: string, userId?: string, category?: string, telegramId?: string) {
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

    // Предпросмотр сборника «в разработке» для доверенных Telegram ID
    const preview = this.isPreviewer(telegramId) && collection.isInDevelopment;
    if (preview) {
      hasAccess = true;
    }

    return {
      ...collection,
      isInDevelopment: preview ? false : collection.isInDevelopment,
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
            coverImageFit: r.coverImageFit,
            coverImagePosition: r.coverImagePosition,
            category: r.category,
            cookingTime: r.cookingTime,
            createdAt: r.createdAt,
            locked: true,
            isFavorite: false,
          })),
    };
  }

  async getRecipe(collectionId: string, recipeId: string, userId?: string, telegramId?: string) {
    let hasAccess = false;
    let isFavorite = false;

    // Доверенным Telegram ID открываем контент для предпросмотра
    if (this.isPreviewer(telegramId)) {
      hasAccess = true;
    }

    if (userId) {
      const access = await this.prisma.recipeCollectionAccess.findUnique({
        where: {
          userId_collectionId: {
            userId,
            collectionId,
          },
        },
      });
      hasAccess = hasAccess || !!access;

      // Проверяем избранное
      const favorite = await this.prisma.favoriteRecipe.findFirst({
        where: {
          userId,
          recipeId,
        },
      });
      isFavorite = !!favorite;
    }

    // Рецепт должен принадлежать именно этому сборнику — иначе доступ к сборнику A
    // нельзя использовать для чтения рецепта из платного сборника B (IDOR).
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, collectionId },
    });

    if (!recipe) {
      throw new ForbiddenException('Recipe not found');
    }

    // Без доступа отдаём только превью — без ингредиентов, инструкций и КБЖУ.
    if (!hasAccess) {
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
        isFavorite,
      };
    }

    return {
      ...recipe,
      locked: false,
      isFavorite,
    };
  }

  // Словарь объединения ингредиентов для списка покупок:
  // { "сырое название из рецепта" (lowercase): "Общее название" }
  async getIngredientAliasMap() {
    const groups = await this.prisma.ingredientGroup.findMany({ include: { aliases: true } });
    const map: Record<string, string> = {};
    groups.forEach((g) => g.aliases.forEach((a) => (map[a.alias] = g.name)));
    return map;
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
