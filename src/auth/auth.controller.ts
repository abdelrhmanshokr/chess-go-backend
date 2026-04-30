import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  /**
   * Controller for authentication-related endpoints.
   */
  constructor(private authService: AuthService) {}

  /**
   * Endpoint for user registration.
   * @param dto Registration data validated by class-validator.
   * @returns Created user data (excluding password).
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * Endpoint for user login.
   * @param dto Login credentials validated by class-validator.
   * @returns JWT access token, refresh token, and user info.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Endpoint for refreshing access tokens.
   */
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: any) {
    const userId = req.user['sub'];
    const refreshToken = req.user['refreshToken'];
    return this.authService.refreshTokens(userId, refreshToken);
  }

  /**
   * Endpoint for logging out and invalidating tokens.
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    const userId = req.user['sub'];
    return this.authService.logout(userId);
  }

  /**
   * Protected endpoint to get the current user's profile.
   * @param user The authenticated user extracted by the CurrentUser decorator.
   * @returns User information.
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    return user;
  }
}
