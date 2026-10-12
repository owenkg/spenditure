import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseDfcuPdf } from './parsers/dfcu.parser';
import { parseMomoEml } from './parsers/momo.parser';
import { parseLedgerXlsx, type LedgerAccountType } from './parsers/ledger.parser';
import { buildLedgerTemplate } from './parsers/ledger-template';
import type { ImportResult } from './dto/import-result.dto';

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importDfcu(userId: string, file: Express.Multer.File): Promise<ImportResult> {
    if (!file.mimetype.includes('pdf') && !file.originalname.endsWith('.pdf')) {
      throw new BadRequestException('Only PDF files are accepted for DFCU import');
    }

    const account = await this.prisma.account.findFirst({
      where: { userId, type: 'BANK', isArchived: false },
    });
    if (!account) throw new BadRequestException('No bank account found. Add a DFCU Bank account first.');

    const transactions = await parseDfcuPdf(file.buffer);
    return this.upsertTransactions(userId, account.id, transactions);
  }

  async importMomo(userId: string, file: Express.Multer.File): Promise<ImportResult> {
    const name = file.originalname.toLowerCase();
    if (!name.endsWith('.eml') && !file.mimetype.includes('message') && !file.mimetype.includes('text')) {
      throw new BadRequestException('Only EML files are accepted for MoMo import');
    }

    const account = await this.prisma.account.findFirst({
      where: { userId, type: 'MOBILE_MONEY', isArchived: false },
    });
    if (!account) throw new BadRequestException('No mobile money account found. Add an MTN MoMo account first.');

    const transactions = await parseMomoEml(file.buffer);
    return this.upsertTransactions(userId, account.id, transactions);
  }

  getLedgerTemplate(): Promise<Buffer> {
    return buildLedgerTemplate();
  }

  async importLedger(userId: string, file: Express.Multer.File): Promise<ImportResult> {
    const name = file.originalname.toLowerCase();
    if (!name.endsWith('.xlsx') && !file.mimetype.includes('spreadsheet') && !file.mimetype.includes('excel')) {
      throw new BadRequestException('Only .xlsx files are accepted for ledger import');
    }

    const rows = await parseLedgerXlsx(file.buffer);
    if (rows.length === 0) throw new BadRequestException('No transactions found in the file');

    // Load all user accounts upfront
    const accounts = await this.prisma.account.findMany({ where: { userId, isArchived: false } });
    const accountByType = (type: LedgerAccountType) =>
      accounts.find((a) => a.type === type) ?? null;

    // Build a category name→id map, creating missing ones on the fly
    const categoryCache = new Map<string, string>();
    const existingCats = await this.prisma.category.findMany({ where: { userId } });
    for (const c of existingCats) categoryCache.set(c.name.toLowerCase(), c.id);

    const ensureCategory = async (name: string, txType: 'INCOME' | 'EXPENSE'): Promise<string | null> => {
      const key = name.toLowerCase();
      if (categoryCache.has(key)) return categoryCache.get(key)!;
      const display = name.charAt(0).toUpperCase() + name.slice(1);
      const created = await this.prisma.category.create({
        data: {
          userId,
          name: display,
          type: txType === 'INCOME' ? 'INCOME' : 'EXPENSE',
          icon: 'tag',
          color: '#6B7280',
        },
      });
      categoryCache.set(key, created.id);
      return created.id;
    };

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const affectedAccountIds = new Set<string>();

    for (const row of rows) {
      try {
        // Skip if already imported (same file re-upload)
        const existing = await this.prisma.transaction.findFirst({
          where: { userId, externalRef: row.externalRef },
        });
        if (existing) { skipped++; continue; }

        const account = accountByType(row.accountType);
        if (!account) {
          errors.push(`No ${row.accountType.replace('_', ' ').toLowerCase()} account found — skipping "${row.description}"`);
          continue;
        }

        const categoryId = await ensureCategory(row.category, row.type);

        await this.prisma.transaction.create({
          data: {
            userId,
            accountId: account.id,
            categoryId,
            type: row.type,
            amount: row.amount,
            description: row.description || `${row.category} transaction`,
            date: row.date,
            externalRef: row.externalRef,
            importSource: 'LEDGER_XLSX',
          },
        });
        imported++;
        affectedAccountIds.add(account.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Row ${row.externalRef}: ${msg}`);
      }
    }

    // Recalculate balance for every affected account
    for (const accountId of affectedAccountIds) {
      const agg = await this.prisma.transaction.aggregate({
        where: { accountId, userId },
        _sum: { amount: true },
      });
      await this.prisma.account.update({
        where: { id: accountId },
        data: { balance: agg._sum.amount ?? 0 },
      });
    }

    return { imported, skipped, errors };
  }

  private async upsertTransactions(
    userId: string,
    accountId: string,
    transactions: Array<{
      date: Date;
      description: string;
      amount: number;
      type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
      externalRef: string;
      importSource: string;
    }>,
  ): Promise<ImportResult> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const tx of transactions) {
      try {
        const existing = await this.prisma.transaction.findFirst({
          where: { userId, externalRef: tx.externalRef },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await this.prisma.transaction.create({
          data: {
            userId,
            accountId,
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            date: tx.date,
            externalRef: tx.externalRef,
            importSource: tx.importSource,
          },
        });
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to import "${tx.description}": ${msg}`);
      }
    }

    // Recalculate account balance after bulk import
    if (imported > 0) {
      const agg = await this.prisma.transaction.aggregate({
        where: { accountId, userId },
        _sum: { amount: true },
      });
      await this.prisma.account.update({
        where: { id: accountId },
        data: { balance: agg._sum.amount ?? 0 },
      });
    }

    return { imported, skipped, errors };
  }
}
