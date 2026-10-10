import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

interface ExportQuery {
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
}

const COLUMNS = ['Date', 'Description', 'Type', 'Amount (UGX)', 'Account', 'Category', 'Note'];

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(userId: string, query: ExportQuery) {
    return {
      userId,
      ...(query.accountId ? { accountId: query.accountId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            date: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };
  }

  private async fetchRows(userId: string, query: ExportQuery) {
    const txns = await this.prisma.transaction.findMany({
      where: this.buildWhere(userId, query),
      orderBy: { date: 'desc' },
      include: { account: true, category: true },
    });
    return txns.map((t) => [
      t.date.toISOString().slice(0, 10),
      t.description,
      t.type,
      t.amount.toNumber().toFixed(2),
      t.account.name,
      t.category?.name ?? '',
      t.note ?? '',
    ]);
  }

  private csvEscape(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  async exportCsv(userId: string, query: ExportQuery, res: Response) {
    const rows = await this.fetchRows(userId, query);
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="spenditure-export-${date}.csv"`);

    res.write(COLUMNS.map(this.csvEscape).join(',') + '\n');
    for (const row of rows) {
      res.write(row.map(this.csvEscape).join(',') + '\n');
    }
    res.end();
  }

  async exportExcel(userId: string, query: ExportQuery, res: Response) {
    const rows = await this.fetchRows(userId, query);
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="spenditure-export-${date}.xlsx"`);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Transactions');

    ws.addRow(COLUMNS);
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A2B22' },
    };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const row of rows) {
      ws.addRow(row);
    }

    ws.columns.forEach((col) => {
      col.width = 20;
    });

    await wb.xlsx.write(res);
    res.end();
  }
}
