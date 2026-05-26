import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import {
  AdminBroadcastService,
  BroadcastDto,
} from '../services/admin-broadcast.service';

@Controller('admin/broadcast')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminBroadcastController {
  constructor(private adminBroadcastService: AdminBroadcastService) {}

  @Post()
  async broadcast(@Body() data: BroadcastDto) {
    return this.adminBroadcastService.broadcast(data);
  }
}
