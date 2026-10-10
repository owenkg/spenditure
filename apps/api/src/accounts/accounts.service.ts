import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAccountDto } from './dto/create-account.dto';
import type { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId, isArchived: false },
      include: { _count: { select: { transactions: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return accounts.map(this.serialize);
  }

  async findOne(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId },
      include: { _count: { select: { transactions: true } } },
    });
    if (!account) throw new NotFoundException('Account not found');
    return this.serialize(account);
  }

  async create(userId: string, dto: CreateAccountDto) {
    const account = await this.prisma.account.create({
      data: { ...dto, userId, balance: 0, currency: dto.currency ?? 'UGX' },
      include: { _count: { select: { transactions: true } } },
    });
    return this.serialize(account);
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    await this.assertOwnership(userId, id);
    const account = await this.prisma.account.update({
      where: { id },
      data: dto,
      include: { _count: { select: { transactions: true } } },
    });
    return this.serialize(account);
  }

  async remove(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    await this.prisma.account.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async getBalanceHistory(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        OR: [{ accountId: id }, { toAccountId: id }],
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'asc' },
      select: { date: true, type: true, amount: true, accountId: true, toAccountId: true },
    });

    const account = await this.prisma.account.findUniqueOrThrow({ where: { id } });
    let runningBalance = account.balance.toNumber();

    const history: { date: string; balance: number }[] = [];
    const txByDay = new Map<string, number>();

    for (const tx of transactions) {
      const day = tx.date.toISOString().slice(0, 10);
      const amount = tx.amount.toNumber();
      let delta = 0;
      if (tx.accountId === id) {
        delta = tx.type === 'INCOME' ? amount : tx.type === 'EXPENSE' ? -amount : -amount;
      } else if (tx.toAccountId === id) {
        delta = amount;
      }
      txByDay.set(day, (txByDay.get(day) ?? 0) + delta);
    }

    for (const [day, delta] of txByDay) {
      runningBalance += delta;
      history.push({ date: day, balance: runningBalance });
    }

    return history;
  }

  async recalculateBalance(accountId: string): Promise<void> {
    const [income, expense, transferIn, transferOut] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { accountId, type: 'INCOME' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { accountId, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { toAccountId: accountId, type: 'TRANSFER' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { accountId, type: 'TRANSFER' },
        _sum: { amount: true },
      }),
    ]);

    const balance =
      (income._sum.amount?.toNumber() ?? 0) -
      (expense._sum.amount?.toNumber() ?? 0) +
      (transferIn._sum.amount?.toNumber() ?? 0) -
      (transferOut._sum.amount?.toNumber() ?? 0);

    await this.prisma.account.update({ where: { id: accountId }, data: { balance } });
  }

  private async assertOwnership(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({ where: { id, userId } });
    if (!account) throw new NotFoundException('Account not found');
  }

  private serialize(
    account: {
      id: string;
      userId: string;
      name: string;
      type: string;
      balance: { toNumber(): number };
      currency: string;
      color: string;
      icon: string;
      isArchived: boolean;
      createdAt: Date;
      updatedAt: Date;
      _count?: { transactions: number };
    },
  ) {
    return {
      ...account,
      balance: account.balance.toNumber(),
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }
}
