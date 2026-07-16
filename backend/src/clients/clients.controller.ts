import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Request,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMeasurementDto } from './dto/measurement.dto';

// Клиентская зона в Mini App: доступ только авторизованным,
// сервис дополнительно проверяет активный клиентский профиль.
@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  /** Гейт для UI: клиент ли я (и заполнена ли анкета) */
  @Get('me')
  async getMe(@Request() req) {
    return this.clientsService.getMyProfile(req.user.id);
  }

  @Get('me/measurements')
  async getMyMeasurements(@Request() req) {
    return this.clientsService.getMyMeasurements(req.user.id);
  }

  @Post('me/measurements')
  async addMyMeasurement(@Request() req, @Body() dto: CreateMeasurementDto) {
    return this.clientsService.addMyMeasurement(req.user.id, dto);
  }

  @Delete('me/measurements/:id')
  async deleteMyMeasurement(@Request() req, @Param('id') id: string) {
    return this.clientsService.deleteMyMeasurement(req.user.id, id);
  }

  // ===== Фото прогресса =====

  @Get('me/photos')
  async getMyPhotos(@Request() req) {
    return this.clientsService.getMyPhotos(req.user.id);
  }

  @Post('me/photos')
  @UseInterceptors(FileInterceptor('file'))
  async addMyPhoto(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body('angle') angle: string,
    @Body('date') date?: string,
  ) {
    return this.clientsService.addMyPhoto(req.user.id, file, angle, date);
  }

  @Delete('me/photos/:id')
  async deleteMyPhoto(@Request() req, @Param('id') id: string) {
    return this.clientsService.deleteMyPhoto(req.user.id, id);
  }

  /** Сам файл фото — стримим только владельцу (в <img> ходим через blob с токеном) */
  @Get('me/photos/:id/file')
  async getMyPhotoFile(
    @Request() req,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const path = await this.clientsService.getMyPhotoPath(req.user.id, id);
    res.sendFile(path);
  }
}
