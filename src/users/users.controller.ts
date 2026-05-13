import { Controller, Get, Patch, Body, UseGuards, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/me
   * Private profile access for the authenticated user.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: any) {
    // CurrentUser decorator usually returns limited data from JWT, 
    // fetch full profile from DB.
    return this.usersService.findOne(user.sub || user.id);
  }

  /**
   * GET /users/:id
   * Public profile access for discovery/leaderboard.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }

  /**
   * PATCH /users/me
   * Self-service profile updates.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async update(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    const userId = user.sub || user.id;
    return this.usersService.update(userId, dto);
  }
}
