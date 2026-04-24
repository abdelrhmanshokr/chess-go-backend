import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

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
}
