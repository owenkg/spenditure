import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import type { Audit } from '@prisma/client';

export interface AuditFinding {
  type: 'possible_duplicate' | 'unverified_manual';
  transactionId: string;
  matchedId?: string;
  description: string;
  amount: number;
  date: string;
}

export interface AuditFindings {
  possibleDuplicates: AuditFinding[];
  unverifiedManual: AuditFinding[];
}

export type AuditWithAccount = Audit & {
  account: { id: string; name: string; type: string; color: string };
};

const AUDITABLE_TYPES = ['MOBILE_MONEY', 'BANK'];
const DAYS_5 = 5 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async runAudit(userId: string, accountId: string, period: string): Promise<Audit> {
    const [year, month] = period.split('-').map(Number);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);

    const txns = await this.prisma.transaction.findMany({
      where: { userId, accountId, date: { gte: from, lte: to } },
    });

    const totalIncome = txns
      .filter((t) => t.type === 'INCOME')
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = txns
      .filter((t) => t.type === 'EXPENSE')
      .reduce((s, t) => s + Number(t.amount), 0);

    const imported = txns.filter((t) => t.externalRef !== null);
    const manual = txns.filter((t) => t.externalRef === null);

    const importPct = txns.length > 0
      ? (imported.length / txns.length) * 100
      : 100;

    const possibleDuplicates: AuditFinding[] = [];
    const unverifiedManual: AuditFinding[] = [];

    for (const m of manual) {
      const mTime = new Date(m.date).getTime();
      const mAmt = Number(m.amount);

      const match = imported.find((imp) => {
        const daysDiff = Math.abs(new Date(imp.date).getTime() - mTime);
        const impAmt = Number(imp.amount);
        const amtDiff = impAmt > 0 ? Math.abs(mAmt - impAmt) / impAmt : 1;
        const typeOk =
          imp.type === m.type ||
          (imp.type === 'EXPENSE' && m.type === 'TRANSFER') ||
          (imp.type === 'TRANSFER' && m.type === 'EXPENSE');
        return daysDiff <= DAYS_5 && amtDiff <= 0.05 && typeOk;
      });

      if (match) {
        possibleDuplicates.push({
          type: 'possible_duplicate',
          transactionId: m.id,
          matchedId: match.id,
          description: m.description,
          amount: mAmt,
          date: m.date.toISOString().slice(0, 10),
        });
      } else {
        unverifiedManual.push({
          type: 'unverified_manual',
          transactionId: m.id,
          description: m.description,
          amount: mAmt,
          date: m.date.toISOString().slice(0, 10),
        });
      }
    }

    const findings: AuditFindings = { possibleDuplicates, unverifiedManual };

    return this.prisma.audit.upsert({
      where: { userId_accountId_period: { userId, accountId, period } },
      create: {
        userId,
        accountId,
        period,
        importedCount: imported.length,
        manualCount: manual.length,
        importPct,
        totalIncome,
        totalExpense,
        findings: JSON.stringify(findings),
      },
      update: {
        importedCount: imported.length,
        manualCount: manual.length,
        importPct,
        totalIncome,
        totalExpense,
        findings: JSON.stringify(findings),
      },
    });
  }

  async runAuditForAccount(userId: string, accountId: string, monthsBack = 2): Promise<AuditWithAccount[]> {
    const now = new Date();
    const periods: string[] = [];
    for (let i = 0; i <= monthsBack; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    await Promise.all(periods.map((p) => this.runAudit(userId, accountId, p)));
    return this.listAuditsForAccount(userId, accountId);
  }

  async runAuditForUser(userId: string): Promise<void> {
    const accounts = await this.prisma.account.findMany({
      where: { userId, type: { in: AUDITABLE_TYPES }, isArchived: false },
    });
    const now = new Date();
    const periods: string[] = [];
    for (let i = 0; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    await Promise.all(
      accounts.flatMap((acc) => periods.map((p) => this.runAudit(userId, acc.id, p))),
    );
  }

  // Keep for backward compat (called from import.service)
  async runAuditForRecentMonths(userId: string, monthsBack = 2): Promise<void> {
    await this.runAuditForUser(userId);
  }

  async listAudits(userId: string): Promise<AuditWithAccount[]> {
    return this.prisma.audit.findMany({
      where: { userId },
      orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
      take: 36,
      include: { account: { select: { id: true, name: true, type: true, color: true } } },
    }) as Promise<AuditWithAccount[]>;
  }

  async listAuditsForAccount(userId: string, accountId: string): Promise<AuditWithAccount[]> {
    return this.prisma.audit.findMany({
      where: { userId, accountId },
      orderBy: { period: 'desc' },
      take: 12,
      include: { account: { select: { id: true, name: true, type: true, color: true } } },
    }) as Promise<AuditWithAccount[]>;
  }

  async getAuditableAccounts(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId, type: { in: AUDITABLE_TYPES }, isArchived: false },
      select: { id: true, name: true, type: true, color: true },
    });
    const now = new Date();
    return Promise.all(
      accounts.map(async (acc) => {
        const latest = await this.prisma.audit.findFirst({
          where: { userId, accountId: acc.id },
          orderBy: { period: 'desc' },
        });
        const daysSince = latest
          ? Math.floor((now.getTime() - new Date(latest.updatedAt).getTime()) / 86400000)
          : null;
        return { ...acc, lastAudit: latest ?? null, daysSinceAudit: daysSince };
      }),
    );
  }

  // Run audit for every user's auditable accounts on the 28th at 08:00
  @Cron('0 8 28 * *')
  async scheduledMonthlyAudit(): Promise<void> {
    this.logger.log('Running scheduled monthly audit for all users');
    const users = await this.prisma.user.findMany({ select: { id: true } });
    for (const u of users) {
      try {
        await this.runAuditForUser(u.id);
      } catch (err) {
        this.logger.error(`Scheduled audit failed for user ${u.id}`, err);
      }
    }
  }
}
