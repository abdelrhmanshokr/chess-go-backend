import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  /**
   * Service responsible for handling authentication logic.
   * Handles user registration, password hashing, and token signing.
   */
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
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
