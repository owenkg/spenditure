import { Body, Controller, Patch, Post } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { ClearDataDto } from './dto/clear-data.dto';
import { ChangePinDto } from './dto/change-pin.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller({ version: '1', path: 'settings' })
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post('data/clear')
  clearData(@CurrentUser() user: JwtPayload, @Body() dto: ClearDataDto) {
    return this.settingsService.clearData(user.sub, dto);
  }

  @Patch('pin')
  changePin(@CurrentUser() user: JwtPayload, @Body() dto: ChangePinDto) {
    return this.settingsService.changePin(user.sub, dto);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.settingsService.updateProfile(user.sub, dto);
  }
}
