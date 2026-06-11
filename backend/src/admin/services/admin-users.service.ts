import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async getUsers(search?: string, status?: string) {
    const where: any = {};

    if (search) {
      where.OR = [
        { telegramId: { contains: search } },
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            workoutAccess: true,
            recipeAccess: true,
          },
        },
      },
    });
  }

  async createUser(telegramId: string) {
    return this.prisma.user.upsert({
      where: { telegramId },
      update: {},
      create: {
        telegramId,
        status: 'PENDING',
      },
    });
  }

  async getUserAccess(userId: string) {
    const [workoutAccess, recipeAccess, allWorkouts, allRecipes] = await Promise.all([
      this.prisma.workoutCollectionAccess.findMany({
        where: { userId },
        include: { collection: true },
      }),
      this.prisma.recipeCollectionAccess.findMany({
        where: { userId },
        include: { collection: true },
      }),
      this.prisma.workoutCollection.findMany({
        select: { id: true, title: true, coverImage: true },
      }),
      this.prisma.recipeCollection.findMany({
        select: { id: true, title: true, coverImage: true },
      }),
    ]);

    const workoutAccessIds = new Set(workoutAccess.map((a) => a.collectionId));
    const recipeAccessIds = new Set(recipeAccess.map((a) => a.collectionId));

    return {
      workouts: allWorkouts.map((w) => ({
        ...w,
        hasAccess: workoutAccessIds.has(w.id),
      })),
      recipes: allRecipes.map((r) => ({
        ...r,
        hasAccess: recipeAccessIds.has(r.id),
      })),
    };
  }

  async updateUserAccess(
    userId: string,
    workoutIds: string[],
    recipeIds: string[],
    adminId?: string,
  ) {
    try {
      // Фильтруем null/undefined значения
      const validWorkoutIds = (workoutIds || []).filter(id => id != null && id !== '');
      const validRecipeIds = (recipeIds || []).filter(id => id != null && id !== '');

      await this.prisma.$transaction(async (tx) => {
        // Удаляем старые доступы
        await tx.workoutCollectionAccess.deleteMany({ where: { userId } });
        await tx.recipeCollectionAccess.deleteMany({ where: { userId } });

        // Добавляем новые доступы к тренировкам
        if (validWorkoutIds.length > 0) {
          await tx.workoutCollectionAccess.createMany({
            data: validWorkoutIds.map((collectionId) => ({
              userId,
              collectionId,
              ...(adminId && { grantedBy: adminId }),
            })),
            skipDuplicates: true,
          });
        }

        // Добавляем новые доступы к рецептам
        if (validRecipeIds.length > 0) {
          await tx.recipeCollectionAccess.createMany({
            data: validRecipeIds.map((collectionId) => ({
              userId,
              collectionId,
              ...(adminId && { grantedBy: adminId }),
            })),
            skipDuplicates: true,
          });
        }
      });

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
    return { success: true };
  }
}
