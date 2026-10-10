import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseDfcuPdf } from './parsers/dfcu.parser';
import { parseMomoEml } from './parsers/momo.parser';
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
