import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRecurringDto } from './dto/create-recurring.dto';
import type { UpdateRecurringDto } from './dto/update-recurring.dto';

function advanceDate(date: Date, frequency: string): Date {
  const next = new Date(date);
  switch (frequency) {
    case 'DAILY':      next.setDate(next.getDate() + 1); break;
    case 'WEEKLY':     next.setDate(next.getDate() + 7); break;
    case 'BIWEEKLY':   next.setDate(next.getDate() + 14); break;
    case 'MONTHLY':    next.setMonth(next.getMonth() + 1); break;
    case 'QUARTERLY':  next.setMonth(next.getMonth() + 3); break;
    case 'YEARLY':     next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
}

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processDue() {
    const now = new Date();
    const due = await this.prisma.recurringTransaction.findMany({
      where: { isActive: true, nextDate: { lte: now } },
    });

    for (const r of due) {
      if (r.endDate && r.endDate < now) {
        await this.prisma.recurringTransaction.update({
          where: { id: r.id },
          data: { isActive: false },
        });
        continue;
      }

      let date = new Date(r.nextDate);
      // catch up if missed multiple periods
      while (date <= now) {
        await this.prisma.transaction.create({
          data: {
            userId: r.userId,
            accountId: r.accountId,
            categoryId: r.categoryId ?? null,
            type: r.type,
            amount: r.amount,
            description: r.description,
            date,
          },
        });
        date = advanceDate(date, r.frequency);
      }

      await this.prisma.recurringTransaction.update({
        where: { id: r.id },
        data: { nextDate: date },
      });
    }

    if (due.length > 0) {
      this.logger.log(`Processed ${due.length} recurring transaction(s)`);
    }
  }

  async findAll(userId: string) {
    const rows = await this.prisma.recurringTransaction.findMany({
      where: { userId },
      orderBy: { nextDate: 'asc' },
    });
    return rows.map(this.serialize);
  }

  async findOne(userId: string, id: string) {
    const row = await this.prisma.recurringTransaction.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Recurring transaction not found');
    return this.serialize(row);
  }

  async create(userId: string, dto: CreateRecurringDto) {
    const row = await this.prisma.recurringTransaction.create({
      data: {
        userId,
        accountId: dto.accountId,
        categoryId: dto.categoryId ?? null,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        frequency: dto.frequency,
        nextDate: new Date(dto.nextDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isActive: dto.isActive ?? true,
      },
    });
    return this.serialize(row);
  }

  async update(userId: string, id: string, dto: UpdateRecurringDto) {
    const existing = await this.prisma.recurringTransaction.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Recurring transaction not found');
    const row = await this.prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.frequency !== undefined ? { frequency: dto.frequency } : {}),
        ...(dto.nextDate !== undefined ? { nextDate: new Date(dto.nextDate) } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      },
    });
    return this.serialize(row);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.recurringTransaction.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Recurring transaction not found');
    await this.prisma.recurringTransaction.delete({ where: { id } });
  }

  private serialize(r: {
    id: string; userId: string; accountId: string; categoryId: string | null;
    type: string; amount: { toNumber(): number }; description: string;
    frequency: string; nextDate: Date; endDate: Date | null;
    isActive: boolean; createdAt: Date; updatedAt: Date;
  }) {
    return {
      ...r,
      amount: r.amount.toNumber(),
      nextDate: r.nextDate.toISOString(),
      endDate: r.endDate?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
