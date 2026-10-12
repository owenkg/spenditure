import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { ClearDataDto } from './dto/clear-data.dto';
import { ChangePinDto } from './dto/change-pin.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Settings')
@UseGuards(JwtAuthGuard)
@Controller({ version: '1', path: 'settings' })
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post('data/clear')
  @ApiOperation({ summary: 'Wipe all transactions (requires PIN confirmation)' })
  @ApiBody({
    examples: {
      default: {
        value: { pin: '1234' },
      },
    },
  })
  clearData(@CurrentUser() user: JwtPayload, @Body() dto: ClearDataDto) {
    return this.settingsService.clearData(user.sub, dto);
  }

  @Patch('pin')
  @ApiOperation({ summary: 'Change PIN' })
  @ApiBody({
    examples: {
      default: {
        value: { currentPin: '1234', newPin: '5678' },
      },
    },
  })
  changePin(@CurrentUser() user: JwtPayload, @Body() dto: ChangePinDto) {
    return this.settingsService.changePin(user.sub, dto);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update display name' })
  @ApiBody({
    examples: {
      default: {
        value: { name: 'George Kivumbi' },
      },
    },
  })
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.settingsService.updateProfile(user.sub, dto);
  }
}
