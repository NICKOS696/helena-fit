import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateTelegramUser(telegramData: any) {
    const { id, username, first_name, last_name, photo_url } = telegramData;

    let user = await this.prisma.user.findUnique({
      where: { telegramId: String(id) },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId: String(id),
          username: username || null,
          firstName: first_name || null,
          lastName: last_name || null,
          photoUrl: photo_url || null,
          status: 'ACTIVE',
        },
      });
    } else if (user.status === 'PENDING') {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'ACTIVE' },
      });
    }

    return user;
  }

  async validateAdmin(username: string, password: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { username },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return admin;
  }

  async loginTelegram(user: any) {
    const payload = { sub: user.id, telegramId: user.telegramId, type: 'user' };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async loginAdmin(admin: any) {
    const payload = { sub: admin.id, username: admin.username, role: admin.role, type: 'admin' };
    return {
      access_token: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    };
  }

  async devLogin(telegramId: string) {
    // Находим или создаем пользователя
    let user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      throw new Error(`User with telegramId ${telegramId} not found`);
    }

    const payload = { sub: user.id, telegramId: user.telegramId, type: 'user' };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
