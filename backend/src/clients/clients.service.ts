import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeasurementDto } from './dto/measurement.dto';

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
    };
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
