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
   * validate function is called automatically by Passport after verifying the token. The returned object is assigned to `request.user`.
   * In this implementation, we simply return the relevant user information from the payload.
   * In a real application, you might want to fetch additional user details from the database here.
   * The returned object will be available in the request handlers via `@CurrentUser()` or `request.user`.
   * For example, if the payload contains `{ sub: userId, email, username }`, we return an object with those properties.
   * This allows us to access the authenticated user's ID, email, and username in our controllers.
   * If the token is invalid or expired, Passport will automatically handle the error and prevent access to protected routes.
   */
  async validate(payload: { sub: string; email: string, username: string }) {
    return { sub: payload.sub, email: payload.email, username: payload.username };
  }
}
