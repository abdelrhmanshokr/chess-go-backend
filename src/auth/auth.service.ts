import { 
    ConflictException, 
    Injectable, 
    UnauthorizedException,
    ForbiddenException,
    Logger 
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { createHash } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * Service responsible for handling authentication logic.
   * Handles user registration, password hashing, and token signing.
   */
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Registers a new user in the database.
   * Hashes the password and checks for existing users with the same email or username.
   * @param dto Registration data (email, username, password).
   * @returns The newly created user object (without password).
   */
  async register(dto: RegisterDto) {
    // Check if user already exists by email or username
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or username already exists');
    }

    // Hash the password before storage
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create the user in the database
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashedPassword,
      },
    });

    // Exclude password from the returned object
    const { password, ...result } = user;
    return result;
  }

  /**
   * Validates user credentials and issues a JWT token.
   * @param dto Login data (identifier, password).
   * @returns An object containing the access token and user info
   */
  async login(dto: LoginDto) {
    // Find user by email or username
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { username: dto.identifier }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare provided password with hashed password in database
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.getTokens(user.id, user.email, user.username);
    
    // Update refresh token hash in database
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        elo: user.elo
      },
    };
  }

  /**
   * Refreshes the access token using a valid refresh token.
   */
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshTokenHash) {
      throw new ForbiddenException('Access Denied');
    }

    // Hash the long JWT into a 64-char hex string to fit in bcrypt's 72-byte limit
    const tokenDataToCompare = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const refreshTokenMatches = await bcrypt.compare(
      tokenDataToCompare,
      user.refreshTokenHash,
    );

    if (!refreshTokenMatches) {
      throw new ForbiddenException('Access Denied');
    }

    const tokens = await this.getTokens(user.id, user.email, user.username);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    return tokens;
  }

  /**
   * Logs out the user by clearing the refresh token hash.
   */
  async logout(userId: string) {
    await this.prisma.user.updateMany({
      where: {
        id: userId,
        refreshTokenHash: { not: null },
      },
      data: {
        refreshTokenHash: null,
      },
    });
  }

  /**
   * Updates the encrypted refresh token in the database.
   */
  async updateRefreshTokenHash(userId: string, refreshToken: string) {
    if (!refreshToken) return;
    
    // Hash the long JWT into a 64-char hex string to fit in bcrypt's 72-byte limit
    const tokenDataToHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');
      
    const hash = await bcrypt.hash(tokenDataToHash, 10);
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }

  /**
   * Generates a pair of access and refresh tokens.
   */
  async getTokens(userId: string, email: string, username: string) {
    const payload = { sub: userId, email, username };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_EXPIRATION') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRATION') as any,
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Legacy method for signing a single token.
   * Redirects to getTokens for internal consistency if still used.
   */
  async signToken(userId: string, email: string, username: string): Promise<string> {
    const tokens = await this.getTokens(userId, email, username);
    return tokens.access_token;
  }
}
