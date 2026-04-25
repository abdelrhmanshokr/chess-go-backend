import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Guard for WebSocket connections that verifies the JWT token.
   * Extracts the token from the handshake auth, headers, or query.
   * Note: For WebSockets, authenticated user is attached to `client.data.user`.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      
      // Extract token from multiple possible locations with safety checks
      const token = this.extractToken(client);

      if (!token) {
        this.logger.error(`No token provided for socket: ${client.id}`);
        return false;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Attach user information to the socket object for future reference
      // (Standardized location for WS authenticated user state)
      client.data.user = payload;
      
      return true;
    } catch (err: any) {
      this.logger.error(`WS Authentication failed for client: ${err.message}`);
      return false;
    }
  }

  /**
   * Robustly extracts the token from handshake auth, headers, or query.
   */
  private extractToken(client: Socket): string | undefined {
    // 1. Check handshake.auth (standard for Socket.io v4+)
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // 2. Check Authorization header (Bearer token)
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        return parts[1];
      }
    }

    // 3. Check query string (backup for some client libraries)
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }

    return undefined;
  }
}
