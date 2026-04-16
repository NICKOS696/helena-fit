import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        photoUrl: true,
        createdAt: true,
      },
    });
  }

  async getAccess(userId: string) {
    const workoutAccess = await this.prisma.workoutCollectionAccess.findMany({
      where: { userId },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
            coverImage: true,
          },
        },
      },
    });

    const recipeAccess = await this.prisma.recipeCollectionAccess.findMany({
      where: { userId },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
            coverImage: true,
          },
        },
      },
    });

    return {
      workouts: workoutAccess.map((a) => a.collection),
      recipes: recipeAccess.map((a) => a.collection),
    };
  }

  async getTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
