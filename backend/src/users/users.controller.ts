import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.id);
  }

  @Get('me/access')
  async getAccess(@Request() req) {
    return this.usersService.getAccess(req.user.id);
  }

  @Get('me/transactions')
  async getTransactions(@Request() req) {
    return this.usersService.getTransactions(req.user.id);
  }
}
