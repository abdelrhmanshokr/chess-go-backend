import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Passport strategy for validating JSON Web Tokens.
   * Extracts the token from the Bearer header and validates it using the secret.
   */
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Method called after the token is verified.
   * @param payload The decoded JWT payload.
   * @returns Object to be attached to the Request object.
   */
  async validate(payload: { sub: string; email: string }) {
    return { sub: payload.sub, email: payload.email };
  }
}
