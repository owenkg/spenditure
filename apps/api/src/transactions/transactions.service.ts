import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
import type { UpdateTransactionDto } from './dto/update-transaction.dto';
import type { QueryTransactionsDto } from './dto/query-transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async findAll(userId: string, query: QueryTransactionsDto) {
    const limit = Math.min(parseInt(query.limit ?? '20', 10), 100);
    const where = this.buildWhereClause(userId, query);

    const [total, items] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        include: { account: true, toAccount: true, category: true },
      }),
    ]);

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return { data: data.map(this.serialize), nextCursor, total };
  }

  async findOne(userId: string, id: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { account: true, toAccount: true, category: true },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    return this.serialize(tx);
  }

  async create(userId: string, dto: CreateTransactionDto) {
    const tx = await this.prisma.transaction.create({
      data: {
        userId,
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        note: dto.note,
        date: new Date(dto.date),
        toAccountId: dto.toAccountId,
        importSource: dto.importSource,
        externalRef: dto.externalRef,
      },
      include: { account: true, toAccount: true, category: true },
    });

    await this.accounts.recalculateBalance(dto.accountId);
    if (dto.toAccountId) await this.accounts.recalculateBalance(dto.toAccountId);

    return this.serialize(tx);
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const existing = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Transaction not found');

    const tx = await this.prisma.transaction.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        description: dto.description,
        note: dto.note,
        ...(dto.date ? { date: new Date(dto.date) } : {}),
      },
      include: { account: true, toAccount: true, category: true },
    });
    return this.serialize(tx);
  }

  async remove(userId: string, id: string) {
    const tx = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!tx) throw new NotFoundException('Transaction not found');

    await this.prisma.transaction.delete({ where: { id } });
    await this.accounts.recalculateBalance(tx.accountId);
    if (tx.toAccountId) await this.accounts.recalculateBalance(tx.toAccountId);
  }

  async getSummary(userId: string, dateFrom?: string, dateTo?: string) {
    const dateFilter = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
    const where = {
      userId,
      ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
    };

    const [incomeAgg, expenseAgg, byCategory] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId', 'type'],
        where: { ...where, type: { in: ['INCOME', 'EXPENSE'] } },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = incomeAgg._sum.amount?.toNumber() ?? 0;
    const totalExpenses = expenseAgg._sum.amount?.toNumber() ?? 0;

    return {
      totalIncome,
      totalExpenses,
      netFlow: totalIncome - totalExpenses,
      byCategory: byCategory.map((g) => ({
        categoryId: g.categoryId,
        type: g.type,
        total: g._sum.amount?.toNumber() ?? 0,
      })),
    };
  }

  private buildWhereClause(userId: string, query: QueryTransactionsDto) {
    return {
      userId,
      ...(query.accountId ? { accountId: query.accountId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            date: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? { description: { contains: query.search } }
        : {}),
    };
  }

  private serialize(tx: {
    id: string;
    userId: string;
    accountId: string;
    categoryId: string | null;
    type: string;
    amount: { toNumber(): number };
    description: string;
    note: string | null;
    date: Date;
    toAccountId: string | null;
    importSource: string | null;
    externalRef: string | null;
    createdAt: Date;
    updatedAt: Date;
    account?: object;
    toAccount?: object | null;
    category?: object | null;
  }) {
    return {
      ...tx,
      amount: tx.amount.toNumber(),
      date: tx.date.toISOString(),
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
    };
  }
}
