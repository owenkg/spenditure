import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import type { Response } from 'express';
import * as bcrypt from 'bcrypt';
import type { SetupDto } from './dto/setup.dto';
import type { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './decorators/current-user.decorator';

const OWNER_EMAIL = 'owner@spenditure.local';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const SEED_ACCOUNTS = [
  { name: 'DFCU Bank', type: 'BANK', color: '#1A2B22', icon: 'building-2' },
  { name: 'MTN MoMo', type: 'MOBILE_MONEY', color: '#FFCB00', icon: 'smartphone' },
  { name: 'Cash', type: 'CASH', color: '#B87212', icon: 'wallet' },
] as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async isSetup(): Promise<boolean> {
    return (await this.prisma.user.count()) > 0;
  }

  async setup(dto: SetupDto, res: Response) {
    if (await this.isSetup()) {
      throw new BadRequestException('App is already set up');
    }
    const pinHash = await bcrypt.hash(dto.pin, 10);
    const user = await this.prisma.user.create({
      data: {
        email: OWNER_EMAIL,
        name: dto.name,
        pinHash,
        accounts: {
          create: SEED_ACCOUNTS.map((a) => ({ ...a, balance: 0, currency: 'UGX' })),
        },
      },
    });
    return this.issueTokens(user.id, res);
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
    if (!user) throw new UnauthorizedException('App not set up yet');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(`Account locked. Try again in ${remaining} minute(s).`);
    }

    const valid = await bcrypt.compare(dto.pin, user.pinHash);
    if (!valid) {
      const attempts = user.loginAttempts + 1;
      const lockedUntil = attempts >= MAX_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: attempts, ...(lockedUntil ? { lockedUntil } : {}) },
      });
      throw new UnauthorizedException('Invalid PIN');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null },
    });

    return this.issueTokens(user.id, res);
  }

  async refresh(userId: string, rawRefreshToken: string, res: Response) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.refreshTokenHash) throw new UnauthorizedException('No active session');
    const valid = await bcrypt.compare(rawRefreshToken, user.refreshTokenHash);
    if (!valid) throw new UnauthorizedException('Invalid refresh token');
    return this.issueTokens(userId, res);
  }

  async logout(userId: string, res: Response) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    this.clearCookies(res);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const { pinHash: _, refreshTokenHash: __, loginAttempts: ___, lockedUntil: ____, ...safe } = user;
    return safe;
  }

  private async issueTokens(userId: string, res: Response) {
    const payload: JwtPayload = { sub: userId };
    const jwtSecret = this.config.get<string>('JWT_SECRET', 'dev-secret');
    const jwtRefreshSecret = this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret');

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtRefreshSecret,
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash } });

    const isProd = this.config.get('NODE_ENV') === 'production';
    // Cross-origin (spenditure.onrender.com → spenditure-api.onrender.com): onrender.com is
    // on the Public Suffix List so they are treated as different sites. SameSite=None;Secure
    // is required for cookies to be sent on cross-site requests in production.
    const cookieOpts = {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
      path: '/',
    };
    res.cookie('access_token', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true, currency: true },
    });
    return { accessToken, refreshToken, user };
  }

  private clearCookies(res: Response) {
    const isProd = this.config.get('NODE_ENV') === 'production';
    const opts = { httpOnly: true, secure: isProd, sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax', path: '/' };
    res.clearCookie('access_token', opts);
    res.clearCookie('refresh_token', opts);
  }
}
