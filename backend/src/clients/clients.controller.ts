import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
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
}
