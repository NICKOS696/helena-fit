import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminWorkoutSectionsService {
  constructor(private prisma: PrismaService) {}

  async createSection(collectionId: string, data: any) {
    return this.prisma.workoutSection.create({
      data: {
        collectionId,
        title: data.title,
        description: data.description,
        type: data.type,
        order: data.order || 0,
      },
      include: {
        items: true,
      },
    });
  }

  async updateSection(sectionId: string, data: any) {
    return this.prisma.workoutSection.update({
      where: { id: sectionId },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        order: data.order,
      },
      include: {
        items: true,
      },
    });
  }

  async deleteSection(sectionId: string) {
    return this.prisma.workoutSection.delete({
      where: { id: sectionId },
    });
  }

  async createSectionItem(sectionId: string, data: any) {
    return this.prisma.workoutSectionItem.create({
      data: {
        sectionId,
        title: data.title,
        description: data.description,
        coverImage: data.coverImage,
        calories: data.calories,
        duration: data.duration,
        rutubeUrl: data.rutubeUrl,
        content: data.content,
        order: data.order || 0,
      },
    });
  }

  async updateSectionItem(itemId: string, data: any) {
    return this.prisma.workoutSectionItem.update({
      where: { id: itemId },
      data: {
        title: data.title,
        description: data.description,
        coverImage: data.coverImage,
        calories: data.calories,
        duration: data.duration,
        rutubeUrl: data.rutubeUrl,
        content: data.content,
        order: data.order,
      },
    });
  }

  async deleteSectionItem(itemId: string) {
    return this.prisma.workoutSectionItem.delete({
      where: { id: itemId },
    });
  }

  async getSections(collectionId: string) {
    return this.prisma.workoutSection.findMany({
      where: { collectionId },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }
}
