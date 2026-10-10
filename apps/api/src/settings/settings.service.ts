import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { ClearDataDto } from './dto/clear-data.dto';
import type { ChangePinDto } from './dto/change-pin.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getUser(userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async clearData(userId: string, dto: ClearDataDto) {
    const user = await this.getUser(userId);
    const valid = await bcrypt.compare(dto.pin, user.pinHash);
    if (!valid) throw new ForbiddenException('Invalid PIN');

    await this.prisma.transaction.deleteMany({ where: { userId } });
    return { cleared: true };
  }

  async changePin(userId: string, dto: ChangePinDto) {
    const user = await this.getUser(userId);
    const valid = await bcrypt.compare(dto.currentPin, user.pinHash);
    if (!valid) throw new ForbiddenException('Current PIN is incorrect');

    const pinHash = await bcrypt.hash(dto.newPin, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { pinHash } });
    return { updated: true };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
      select: { id: true, name: true, email: true, currency: true },
    });
    return user;
  }
}
