import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SetupDto } from './dto/setup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser, type JwtPayload } from './decorators/current-user.decorator';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@ApiTags('Auth')
@Controller({ version: '1', path: 'auth' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Check if first-time setup has been completed' })
  async status() {
    return { isSetup: await this.authService.isSetup() };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('setup')
  @ApiOperation({ summary: 'Create owner account (run once)' })
  @ApiBody({
    examples: {
      default: {
        value: { name: 'George', pin: '1234' },
      },
    },
  })
  async setup(@Body() dto: SetupDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.setup(dto, res);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with PIN' })
  @ApiBody({
    examples: {
      default: {
        value: { pin: '1234' },
      },
    },
  })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate token pair using refresh token' })
  @ApiBody({
    examples: {
      default: {
        value: { refreshToken: '<refresh-token-from-login-response>' },
      },
    },
  })
  async refresh(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refresh(user.sub, dto.refreshToken, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear session cookies and invalidate refresh token' })
  async logout(@CurrentUser() user: JwtPayload, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(user.sub, res);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.sub);
  }
}
