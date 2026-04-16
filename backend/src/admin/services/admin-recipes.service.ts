import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateRecipeCollectionDto {
  title: string;
  description?: string;
  coverImage?: string;
  price: number;
  discount?: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountEndDate?: Date;
  order?: number;
}

export interface CreateRecipeDto {
  title: string;
  description?: string;
  coverImage?: string;
  category: 'BREAKFAST' | 'LUNCH' | 'SNACK' | 'DINNER' | 'SALAD';
  cookingTime?: number;
  ingredients: any;
  instructions: string;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  fatPer100g?: number;
  carbsPer100g?: number;
  caloriesPerServing?: number;
  proteinPerServing?: number;
  fatPerServing?: number;
  carbsPerServing?: number;
  order?: number;
}

@Injectable()
export class AdminRecipesService {
  constructor(private prisma: PrismaService) {}

  async getCollections() {
    return this.prisma.recipeCollection.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { recipes: true },
        },
      },
    });
  }

  async getCollection(id: string) {
    return this.prisma.recipeCollection.findUnique({
      where: { id },
      include: {
        recipes: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async createCollection(data: CreateRecipeCollectionDto) {
    return this.prisma.recipeCollection.create({
      data,
    });
  }

  async updateCollection(id: string, data: Partial<CreateRecipeCollectionDto>) {
    return this.prisma.recipeCollection.update({
      where: { id },
      data,
    });
  }

  async deleteCollection(id: string) {
    await this.prisma.recipeCollection.delete({ where: { id } });
    return { success: true };
  }

  async createRecipe(collectionId: string, data: CreateRecipeDto) {
    return this.prisma.recipe.create({
      data: {
        ...data,
        collectionId,
      },
    });
  }

  async updateRecipe(id: string, data: Partial<CreateRecipeDto>) {
    return this.prisma.recipe.update({
      where: { id },
      data,
    });
  }

  async deleteRecipe(id: string) {
    await this.prisma.recipe.delete({ where: { id } });
    return { success: true };
  }

  async reorderRecipes(collectionId: string, recipeIds: string[]) {
    await this.prisma.$transaction(
      recipeIds.map((id, index) =>
        this.prisma.recipe.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
    return { success: true };
  }
}
