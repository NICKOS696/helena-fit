import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeasurementDto } from './dto/measurement.dto';
import { join, resolve } from 'path';
import { unlink } from 'fs/promises';

// Приватное хранилище фото (nginx его не раздаёт, доступ только через API)
export const PRIVATE_UPLOAD_DIR =
  process.env.PRIVATE_UPLOAD_DIR || './private-uploads';

const MEASUREMENT_FIELDS = [
  'weight',
  'chest',
  'waist',
  'belly',
  'hips',
  'thigh',
  'arm',
] as const;

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  // ===== Для клиента (Mini App) =====

  /** Профиль клиента текущего пользователя; null — не клиент (гейт для UI). */
  async getMyProfile(userId: string) {
    const profile = await this.prisma.clientProfile.findUnique({
      where: { userId },
    });
    if (!profile || profile.status !== 'ACTIVE') return { isClient: false };
    return {
      isClient: true,
      startedAt: profile.startedAt,
      hasQuestionnaire: !!profile.questionnaire,
      questionnaire: profile.questionnaire,
    };
  }

  /** Первичная анкета: ФИО, дата рождения, состояние здоровья (один раз). */
  async submitQuestionnaire(
    userId: string,
    dto: { fullName: string; birthDate: string; health: string },
  ) {
    const profile = await this.requireActiveProfile(userId);
    return this.prisma.clientProfile.update({
      where: { id: profile.id },
      data: {
        questionnaire: {
          fullName: dto.fullName.trim(),
          birthDate: dto.birthDate,
          health: dto.health.trim(),
          filledAt: new Date().toISOString(),
        },
      },
      select: { id: true },
    });
  }

  // ===== Впечатления от тренировок =====

  async getMyFeedback(userId: string) {
    const profile = await this.requireActiveProfile(userId);
    return this.prisma.clientFeedback.findMany({
      where: { clientId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async addMyFeedback(userId: string, text: string) {
    const profile = await this.requireActiveProfile(userId);
    return this.prisma.clientFeedback.create({
      data: { clientId: profile.id, text: text.trim() },
    });
  }

  async deleteMyFeedback(userId: string, feedbackId: string) {
    const profile = await this.requireActiveProfile(userId);
    const f = await this.prisma.clientFeedback.findFirst({
      where: { id: feedbackId, clientId: profile.id },
    });
    if (!f) throw new NotFoundException('Комментарий не найден');
    await this.prisma.clientFeedback.delete({ where: { id: f.id } });
    return { success: true };
  }

  /** Активный профиль клиента или 404 — общая проверка для клиентских операций. */
  private async requireActiveProfile(userId: string) {
    const profile = await this.prisma.clientProfile.findUnique({
      where: { userId },
    });
    if (!profile || profile.status !== 'ACTIVE') {
      throw new NotFoundException('Клиентский доступ не открыт');
    }
    return profile;
  }

  async getMyMeasurements(userId: string) {
    const profile = await this.requireActiveProfile(userId);
    return this.prisma.clientMeasurement.findMany({
      where: { clientId: profile.id },
      orderBy: { date: 'desc' },
      take: 200,
    });
  }

  async addMyMeasurement(userId: string, dto: CreateMeasurementDto) {
    const profile = await this.requireActiveProfile(userId);
    return this.createMeasurement(profile.id, dto, false);
  }

  /** Удалить свой замер (например, ошибочный) */
  async deleteMyMeasurement(userId: string, measurementId: string) {
    const profile = await this.requireActiveProfile(userId);
    const m = await this.prisma.clientMeasurement.findFirst({
      where: { id: measurementId, clientId: profile.id },
    });
    if (!m) throw new NotFoundException('Замер не найден');
    await this.prisma.clientMeasurement.delete({ where: { id: m.id } });
    return { success: true };
  }

  // ===== Для тренера (админка) =====

  async listClients() {
    const clients = await this.prisma.clientProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            firstName: true,
            lastName: true,
            username: true,
            photoUrl: true,
          },
        },
        measurements: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });
    return clients.map((c) => ({
      id: c.id,
      status: c.status,
      startedAt: c.startedAt,
      notes: c.notes,
      user: c.user,
      lastMeasurement: c.measurements[0] || null,
    }));
  }

  /** Отметить пользователя как клиента (или реактивировать архивного). */
  async markClient(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const existing = await this.prisma.clientProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      if (existing.status === 'ACTIVE') {
        throw new ConflictException('Пользователь уже клиент');
      }
      return this.prisma.clientProfile.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE' },
      });
    }
    return this.prisma.clientProfile.create({ data: { userId } });
  }

  /** Снять отметку клиента: архивируем (история замеров сохраняется). */
  async archiveClient(profileId: string) {
    await this.getClientOr404(profileId);
    return this.prisma.clientProfile.update({
      where: { id: profileId },
      data: { status: 'ARCHIVED' },
    });
  }

  async updateNotes(profileId: string, notes: string) {
    await this.getClientOr404(profileId);
    return this.prisma.clientProfile.update({
      where: { id: profileId },
      data: { notes },
    });
  }

  /** Карточка клиента: профиль + все замеры. */
  async getClientCard(profileId: string) {
    const profile = await this.prisma.clientProfile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            firstName: true,
            lastName: true,
            username: true,
            photoUrl: true,
            createdAt: true,
          },
        },
        measurements: { orderBy: { date: 'desc' }, take: 500 },
        feedback: { orderBy: { createdAt: 'desc' }, take: 100 },
      },
    });
    if (!profile) throw new NotFoundException('Клиент не найден');
    return profile;
  }

  async addMeasurementByTrainer(profileId: string, dto: CreateMeasurementDto) {
    await this.getClientOr404(profileId);
    return this.createMeasurement(profileId, dto, true);
  }

  async deleteMeasurementByTrainer(profileId: string, measurementId: string) {
    const m = await this.prisma.clientMeasurement.findFirst({
      where: { id: measurementId, clientId: profileId },
    });
    if (!m) throw new NotFoundException('Замер не найден');
    await this.prisma.clientMeasurement.delete({ where: { id: m.id } });
    return { success: true };
  }

  // ===== Фото прогресса =====

  /** Мои фото (клиент) */
  async getMyPhotos(userId: string) {
    const profile = await this.requireActiveProfile(userId);
    return this.listPhotos(profile.id);
  }

  async addMyPhoto(
    userId: string,
    file: Express.Multer.File,
    angle: string,
    date?: string,
  ) {
    const profile = await this.requireActiveProfile(userId);
    return this.createPhoto(profile.id, file, angle, date, false);
  }

  async deleteMyPhoto(userId: string, photoId: string) {
    const profile = await this.requireActiveProfile(userId);
    return this.removePhoto(profile.id, photoId);
  }

  /** Абсолютный путь к файлу фото — только если фото принадлежит этому клиенту */
  async getMyPhotoPath(userId: string, photoId: string) {
    const profile = await this.requireActiveProfile(userId);
    return this.photoPath(profile.id, photoId);
  }

  /** Фото клиента (тренер) */
  async getClientPhotos(profileId: string) {
    await this.getClientOr404(profileId);
    return this.listPhotos(profileId);
  }

  async addPhotoByTrainer(
    profileId: string,
    file: Express.Multer.File,
    angle: string,
    date?: string,
  ) {
    await this.getClientOr404(profileId);
    return this.createPhoto(profileId, file, angle, date, true);
  }

  async deletePhotoByTrainer(profileId: string, photoId: string) {
    return this.removePhoto(profileId, photoId);
  }

  async getPhotoPathByTrainer(profileId: string, photoId: string) {
    return this.photoPath(profileId, photoId);
  }

  private listPhotos(clientId: string) {
    return this.prisma.clientPhoto.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 500,
      select: { id: true, date: true, angle: true, byTrainer: true },
    });
  }

  private async createPhoto(
    clientId: string,
    file: Express.Multer.File,
    angle: string,
    date: string | undefined,
    byTrainer: boolean,
  ) {
    if (!file) throw new ConflictException('Файл не получен');
    if (!['FRONT', 'SIDE_LEFT', 'SIDE_RIGHT', 'BACK'].includes(angle)) {
      throw new ConflictException('Неверный ракурс');
    }
    // Новое фото ракурса заменяет прежнее за тот же день (и его файл).
    // Границы дня — по Ташкенту (UTC+5), как их видит пользователь.
    const TZ_MS = 5 * 3600 * 1000;
    const target = date ? new Date(date) : new Date();
    const dayStart = new Date(
      Math.floor((target.getTime() + TZ_MS) / 86400000) * 86400000 - TZ_MS,
    );
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
    const olds = await this.prisma.clientPhoto.findMany({
      where: {
        clientId,
        angle: angle as any,
        date: { gte: dayStart, lt: dayEnd },
      },
    });
    for (const o of olds) {
      await this.prisma.clientPhoto.delete({ where: { id: o.id } });
      try {
        await unlink(join(PRIVATE_UPLOAD_DIR, o.filePath));
      } catch {
        /* файла может уже не быть */
      }
    }
    return this.prisma.clientPhoto.create({
      data: {
        clientId,
        angle: angle as any,
        filePath: file.filename,
        date: date ? new Date(date) : new Date(),
        byTrainer,
      },
      select: { id: true, date: true, angle: true, byTrainer: true },
    });
  }

  private async removePhoto(clientId: string, photoId: string) {
    const photo = await this.prisma.clientPhoto.findFirst({
      where: { id: photoId, clientId },
    });
    if (!photo) throw new NotFoundException('Фото не найдено');
    await this.prisma.clientPhoto.delete({ where: { id: photo.id } });
    // Файл убираем тоже; если его уже нет — не падаем
    try {
      await unlink(join(PRIVATE_UPLOAD_DIR, photo.filePath));
    } catch {
      /* файл мог быть удалён раньше */
    }
    return { success: true };
  }

  private async photoPath(clientId: string, photoId: string) {
    const photo = await this.prisma.clientPhoto.findFirst({
      where: { id: photoId, clientId },
    });
    if (!photo) throw new NotFoundException('Фото не найдено');
    // resolve корректно работает и с абсолютным PRIVATE_UPLOAD_DIR (в контейнере),
    // и с относительным (в dev): join ломал абсолютный путь, склеивая его с cwd.
    return resolve(PRIVATE_UPLOAD_DIR, photo.filePath);
  }

  // ===== Общее =====

  private async getClientOr404(profileId: string) {
    const p = await this.prisma.clientProfile.findUnique({
      where: { id: profileId },
    });
    if (!p) throw new NotFoundException('Клиент не найден');
    return p;
  }

  private createMeasurement(
    clientId: string,
    dto: CreateMeasurementDto,
    byTrainer: boolean,
  ) {
    // Пустой замер не сохраняем
    const hasValue = MEASUREMENT_FIELDS.some(
      (f) => dto[f] !== undefined && dto[f] !== null,
    );
    if (!hasValue) {
      throw new ConflictException('Заполните хотя бы одно измерение');
    }
    return this.prisma.clientMeasurement.create({
      data: {
        clientId,
        date: dto.date ? new Date(dto.date) : new Date(),
        weight: dto.weight ?? null,
        chest: dto.chest ?? null,
        waist: dto.waist ?? null,
        belly: dto.belly ?? null,
        hips: dto.hips ?? null,
        thigh: dto.thigh ?? null,
        arm: dto.arm ?? null,
        note: dto.note || null,
        byTrainer,
      },
    });
  }
}
