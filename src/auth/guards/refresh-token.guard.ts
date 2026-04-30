import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {
  /**
   * Guard for the /auth/refresh endpoint.
   * Uses the 'jwt-refresh' strategy to validate the long-lived token.
   */
  constructor() {
    super();
  }
}
