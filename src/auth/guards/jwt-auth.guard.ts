import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Custom Guard that extends the default Passport JWT AuthGuard.
   * Handles user authentication for HTTP requests.
   */
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Please log in to access this resource');
    }
    return user;
  }
}
