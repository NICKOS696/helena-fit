import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { AdminUsersService } from '../services/admin-users.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUsersController {
  constructor(private adminUsersService: AdminUsersService) {}

  @Get()
  async getUsers(@Query('search') search?: string, @Query('status') status?: string) {
    return this.adminUsersService.getUsers(search, status);
  }

  @Post()
  async createUser(@Body() body: { telegramId: string }) {
    return this.adminUsersService.createUser(body.telegramId);
  }

  @Get(':id/access')
  async getUserAccess(@Param('id') id: string) {
    return this.adminUsersService.getUserAccess(id);
  }

  @Put(':id/access')
  async updateUserAccess(
    @Param('id') id: string,
    @Body() body: { workoutIds: string[]; recipeIds: string[] },
    @Request() req,
  ) {
    console.log('Updating user access:', {
      userId: id,
      workoutIds: body.workoutIds,
      recipeIds: body.recipeIds,
      adminId: req.user?.id,
    });
    
    return this.adminUsersService.updateUserAccess(
      id,
      body.workoutIds || [],
      body.recipeIds || [],
      req.user?.id,
    );
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.adminUsersService.deleteUser(id);
  }
}
