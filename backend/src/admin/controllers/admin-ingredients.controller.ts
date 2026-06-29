import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { AdminIngredientsService } from '../services/admin-ingredients.service';

@Controller('admin/ingredients')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminIngredientsController {
  constructor(private service: AdminIngredientsService) {}

  @Get()
  async overview() {
    return this.service.getOverview();
  }

  @Post('groups')
  async createGroup(@Body() body: { name: string }) {
    return this.service.createGroup(body.name);
  }

  @Put('groups/:id')
  async renameGroup(@Param('id') id: string, @Body() body: { name: string }) {
    return this.service.renameGroup(id, body.name);
  }

  @Delete('groups/:id')
  async deleteGroup(@Param('id') id: string) {
    return this.service.deleteGroup(id);
  }

  @Post('assign')
  async assign(@Body() body: { groupId: string; aliases: string[] }) {
    return this.service.assign(body.groupId, body.aliases);
  }

  @Post('unassign')
  async unassign(@Body() body: { aliases: string[] }) {
    return this.service.unassign(body.aliases);
  }
}
