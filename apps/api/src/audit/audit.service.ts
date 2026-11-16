import { Injectable } from '@nestjs/common';
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

const STATEMENT_ACCOUNT_TYPES = ['MOBILE_MONEY', 'BANK'];
const DAYS_5 = 5 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async runAudit(userId: string, period: string): Promise<Audit> {
    const [year, month] = period.split('-').map(Number);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);

    const txns = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: from, lte: to } },
      include: { account: { select: { type: true } } },
    });

    // Totals
    const totalIncome = txns
      .filter((t) => t.type === 'INCOME')
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = txns
      .filter((t) => t.type === 'EXPENSE')
      .reduce((s, t) => s + Number(t.amount), 0);

    // Split statement-account txns into imported vs manual
    const statementTxns = txns.filter((t) =>
      STATEMENT_ACCOUNT_TYPES.includes(t.account.type),
    );
    const imported = statementTxns.filter((t) => t.externalRef !== null);
    const manual = statementTxns.filter((t) => t.externalRef === null);

    const importPct =
      statementTxns.length > 0
        ? (imported.length / statementTxns.length) * 100
        : 100;

    // Build findings
    const possibleDuplicates: AuditFinding[] = [];
    const unverifiedManual: AuditFinding[] = [];

    for (const m of manual) {
      const mTime = new Date(m.date).getTime();
      const mAmt = Number(m.amount);

      const match = imported.find((imp) => {
        const daysDiff = Math.abs(new Date(imp.date).getTime() - mTime);
        const impAmt = Number(imp.amount);
        const amtDiff = impAmt > 0 ? Math.abs(mAmt - impAmt) / impAmt : 1;
        // same type (or TRANSFER≡EXPENSE), within 5 days, within 5% amount
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
      where: { userId_period: { userId, period } },
      create: {
        userId,
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

  async runAuditForRecentMonths(userId: string, monthsBack = 2): Promise<void> {
    const now = new Date();
    const periods: string[] = [];
    for (let i = 0; i <= monthsBack; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    await Promise.all(periods.map((p) => this.runAudit(userId, p)));
  }

  async listAudits(userId: string): Promise<Audit[]> {
    return this.prisma.audit.findMany({
      where: { userId },
      orderBy: { period: 'desc' },
      take: 12,
    });
  }

  async getAudit(userId: string, period: string): Promise<Audit | null> {
    return this.prisma.audit.findUnique({
      where: { userId_period: { userId, period } },
    });
  }
}
