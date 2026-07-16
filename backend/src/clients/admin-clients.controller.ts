import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateMeasurementDto } from './dto/measurement.dto';
import { IsString } from 'class-validator';

class MarkClientDto {
  @IsString()
  userId: string;
}

class NotesDto {
  @IsString()
  notes: string;
}

// Кабинет тренера: управление клиентами (только админ)
@Controller('admin/clients')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  async list() {
    return this.clientsService.listClients();
  }

  @Post()
  async mark(@Body() dto: MarkClientDto) {
    return this.clientsService.markClient(dto.userId);
  }

  @Get(':id')
  async card(@Param('id') id: string) {
    return this.clientsService.getClientCard(id);
  }

  @Patch(':id/archive')
  async archive(@Param('id') id: string) {
    return this.clientsService.archiveClient(id);
  }

  @Patch(':id/notes')
  async notes(@Param('id') id: string, @Body() dto: NotesDto) {
    return this.clientsService.updateNotes(id, dto.notes);
  }

  @Post(':id/measurements')
  async addMeasurement(
    @Param('id') id: string,
    @Body() dto: CreateMeasurementDto,
  ) {
    return this.clientsService.addMeasurementByTrainer(id, dto);
  }

  @Delete(':id/measurements/:measurementId')
  async deleteMeasurement(
    @Param('id') id: string,
    @Param('measurementId') measurementId: string,
  ) {
    return this.clientsService.deleteMeasurementByTrainer(id, measurementId);
  }

  // ===== Фото прогресса =====

  @Get(':id/photos')
  async photos(@Param('id') id: string) {
    return this.clientsService.getClientPhotos(id);
  }

  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('file'))
  async addPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('angle') angle: string,
    @Body('date') date?: string,
  ) {
    return this.clientsService.addPhotoByTrainer(id, file, angle, date);
  }

  @Delete(':id/photos/:photoId')
  async deletePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.clientsService.deletePhotoByTrainer(id, photoId);
  }

  @Get(':id/photos/:photoId/file')
  async photoFile(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Res() res: Response,
  ) {
    const path = await this.clientsService.getPhotoPathByTrainer(id, photoId);
    res.sendFile(path);
  }
}
