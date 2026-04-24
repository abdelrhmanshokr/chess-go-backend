import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  /**
   * Service responsible for handling authentication logic.
   * Currently focused on JWT token generation.
   */
  constructor(private jwtService: JwtService) {}

  /**
   * Signs a JWT token for a given user.
   * @param userId The unique identifier of the user.
   * @param email The user's email address.
   * @returns Signed JWT token.
   */
  async signToken(userId: string, email: string): Promise<string> {
    const payload = {
      sub: userId,
      email,
    };

    return this.jwtService.signAsync(payload);
  }
}
