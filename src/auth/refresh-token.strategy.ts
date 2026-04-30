import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  private readonly logger = new Logger(RefreshTokenStrategy.name);

  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    } as any);
  }

  /**
   * Validates the refresh token and extracts the payload.
   * Returns the payload along with the raw refresh token for database comparison.
   */
  validate(req: Request, payload: any) {
    const refreshToken = req.get('Authorization')?.replace('Bearer', '').trim();

    if (!refreshToken) {
      this.logger.error('No refresh token found in request headers');
      throw new ForbiddenException('Refresh token malformed');
    }

    return {
      ...payload,
      refreshToken,
    };
  }
}
