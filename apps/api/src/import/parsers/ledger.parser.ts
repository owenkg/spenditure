import ExcelJS from 'exceljs';

export type LedgerAccountType = 'CASH' | 'MOBILE_MONEY' | 'BANK';

export interface ParsedLedgerRow {
  /** ISO date string */
  date: Date;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  /** Raw category name, lower-cased */
  category: string;
  accountType: LedgerAccountType;
  description: string;
  /** sheet:rowIndex for re-import deduplication */
  externalRef: string;
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const MODE_MAP: Record<string, LedgerAccountType> = {
  cash: 'CASH',
  'mobile money': 'MOBILE_MONEY',
  'wallet/mobile money': 'MOBILE_MONEY',
  wallet: 'MOBILE_MONEY',
  'debit card': 'BANK',
};

function parseOrdinalDay(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/[a-z]+$/i, '');
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

function parseSheetDate(sheetName: string): { month: number; year: number } | null {
  const parts = sheetName.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const month = MONTH_MAP[parts[0].toLowerCase().slice(0, 3)];
  const year = parseInt(parts[parts.length - 1], 10);
  if (month == null || isNaN(year)) return null;
  return { month, year };
}

export async function parseLedgerXlsx(buffer: Buffer): Promise<ParsedLedgerRow[]> {
  const wb = new ExcelJS.Workbook();
  // Buffer generic mismatch between Node types and ExcelJS typings
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);

  const rows: ParsedLedgerRow[] = [];

  wb.eachSheet((ws) => {
    const sheetMeta = parseSheetDate(ws.name);
    if (!sheetMeta) return;
    const { month, year } = sheetMeta;

    let currentDay: number | null = null;
    let rowIndex = 0;

    ws.eachRow((row, _lineNum) => {
      rowIndex++;
      // Skip header row
      const col1 = row.getCell(1).value;
      if (col1 === 'Date') return;

      const rawDate = col1;
      const rawAmount = row.getCell(2).value;
      const rawType = row.getCell(3).value;
      const rawCategory = row.getCell(4).value;
      const rawMode = row.getCell(5).value;
      const rawDesc = row.getCell(6).value;

      // Update current day if a new day marker appears
      const dayNum = parseOrdinalDay(rawDate);
      if (dayNum !== null) currentDay = dayNum;

      // Skip rows with no usable data
      if (rawAmount == null || rawType == null || rawMode == null) return;

      const amount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount));
      if (isNaN(amount) || amount <= 0) return;

      const typeStr = String(rawType).toLowerCase().trim();
      if (typeStr !== 'expense' && typeStr !== 'income') return;

      const modeStr = String(rawMode).toLowerCase().trim();
      // Skip accidental header-leak rows
      if (modeStr === 'payment mode') return;

      const accountType = MODE_MAP[modeStr] ?? 'CASH';
      const category = rawCategory ? String(rawCategory).toLowerCase().trim() : 'others';
      const description = rawDesc ? String(rawDesc).trim() : '';

      const day = currentDay ?? 1;
      const date = new Date(year, month, day, 12, 0, 0);

      rows.push({
        date,
        amount,
        type: typeStr === 'income' ? 'INCOME' : 'EXPENSE',
        category,
        accountType,
        description,
        externalRef: `ledger:${ws.name}:${rowIndex}`,
      });
    });
  });

  return rows;
}
