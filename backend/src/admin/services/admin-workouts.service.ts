import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateWorkoutCollectionDto {
  title: string;
  description?: string;
  coverImage?: string;
  price: number;
  discount?: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountEndDate?: Date;
  order?: number;
}

export interface CreateWorkoutDto {
  title: string;
  description?: string;
  coverImage?: string;
  calories?: number;
  duration?: number;
  rutubeUrl?: string;
  order?: number;
}

@Injectable()
export class AdminWorkoutsService {
  constructor(private prisma: PrismaService) {}

  async getCollections() {
    return this.prisma.workoutCollection.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { workouts: true },
        },
      },
    });
  }

  async getCollection(id: string) {
    return this.prisma.workoutCollection.findUnique({
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
  }

  async createCollection(data: CreateWorkoutCollectionDto) {
    return this.prisma.workoutCollection.create({
      data,
    });
  }

  async updateCollection(id: string, data: Partial<CreateWorkoutCollectionDto>) {
    return this.prisma.workoutCollection.update({
      where: { id },
      data,
    });
  }

  async deleteCollection(id: string) {
    await this.prisma.workoutCollection.delete({ where: { id } });
    return { success: true };
  }

  async createWorkout(collectionId: string, data: CreateWorkoutDto) {
    return this.prisma.workout.create({
      data: {
        ...data,
        collectionId,
      },
    });
  }

  async updateWorkout(id: string, data: Partial<CreateWorkoutDto>) {
    return this.prisma.workout.update({
      where: { id },
      data,
    });
  }

  async deleteWorkout(id: string) {
    await this.prisma.workout.delete({ where: { id } });
    return { success: true };
  }

  async reorderWorkouts(collectionId: string, workoutIds: string[]) {
    await this.prisma.$transaction(
      workoutIds.map((id, index) =>
        this.prisma.workout.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
    return { success: true };
  }
}
