import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBudgetDto } from './dto/create-budget.dto';
import type { UpdateBudgetDto } from './dto/update-budget.dto';

type Period = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

function getPeriodWindow(period: Period, startDate: Date): { from: Date; to: Date } {
  const from = new Date(startDate);
  const to = new Date(startDate);

  switch (period) {
    case 'WEEKLY':
      to.setDate(to.getDate() + 7);
      break;
    case 'MONTHLY':
      to.setMonth(to.getMonth() + 1);
      break;
    case 'QUARTERLY':
      to.setMonth(to.getMonth() + 3);
      break;
    case 'YEARLY':
      to.setFullYear(to.getFullYear() + 1);
      break;
  }

  // Advance the window until it contains today
  const now = new Date();
  while (to < now) {
    from.setTime(to.getTime());
    switch (period) {
      case 'WEEKLY':
        to.setDate(to.getDate() + 7);
        break;
      case 'MONTHLY':
        to.setMonth(to.getMonth() + 1);
        break;
      case 'QUARTERLY':
        to.setMonth(to.getMonth() + 3);
        break;
      case 'YEARLY':
        to.setFullYear(to.getFullYear() + 1);
        break;
    }
  }

  return { from, to };
}

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  private async computeSpent(
    userId: string,
    categoryId: string,
    period: Period,
    startDate: Date,
  ): Promise<number> {
    const { from, to } = getPeriodWindow(period, startDate);

    // Include child category IDs
    const children = await this.prisma.category.findMany({
      where: { parentId: categoryId, userId },
      select: { id: true },
    });
    const categoryIds = [categoryId, ...children.map((c) => c.id)];

    const agg = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'EXPENSE',
        categoryId: { in: categoryIds },
        date: { gte: from, lt: to },
      },
      _sum: { amount: true },
    });

    return agg._sum.amount?.toNumber() ?? 0;
  }

  async findAll(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      budgets.map(async (b) => {
        const spent = await this.computeSpent(
          userId,
          b.categoryId,
          b.period as Period,
          b.startDate,
        );
        return this.serialize(b, spent);
      }),
    );
  }

  async findOne(userId: string, id: string) {
    const b = await this.prisma.budget.findFirst({
      where: { id, userId },
      include: { category: true },
    });
    if (!b) throw new NotFoundException('Budget not found');
    const spent = await this.computeSpent(userId, b.categoryId, b.period as Period, b.startDate);
    return this.serialize(b, spent);
  }

  async create(userId: string, dto: CreateBudgetDto) {
    const cat = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, userId },
    });
    if (!cat) throw new NotFoundException('Category not found');

    const b = await this.prisma.budget.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        period: dto.period,
        startDate: new Date(dto.startDate),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
      },
      include: { category: true },
    });
    const spent = await this.computeSpent(userId, b.categoryId, b.period as Period, b.startDate);
    return this.serialize(b, spent);
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    const existing = await this.prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Budget not found');

    const b = await this.prisma.budget.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.period ? { period: dto.period } : {}),
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
      },
      include: { category: true },
    });
    const spent = await this.computeSpent(userId, b.categoryId, b.period as Period, b.startDate);
    return this.serialize(b, spent);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Budget not found');
    await this.prisma.budget.delete({ where: { id } });
  }

  private serialize(
    b: {
      id: string;
      userId: string;
      categoryId: string;
      amount: { toNumber(): number };
      period: string;
      startDate: Date;
      endDate: Date | null;
      createdAt: Date;
      updatedAt: Date;
      category: object;
    },
    spent: number,
  ) {
    const amount = b.amount.toNumber();
    return {
      ...b,
      amount,
      spent,
      remaining: Math.max(0, amount - spent),
      startDate: b.startDate.toISOString(),
      endDate: b.endDate?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }
}
