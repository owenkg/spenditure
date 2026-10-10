import { createHash } from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer, opts?: object) => Promise<{ text: string }>;

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  externalRef: string;
  importSource: 'DFCU_PDF';
}

const DATE_RE = /^(\d{2}-\d{2}-\d{4})\s+(\d{2}-\d{2}-\d{4})\s+(.+?)\s{2,}([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?/;

function parseAmount(raw: string | undefined): number {
  if (!raw) return 0;
  return parseFloat(raw.replace(/,/g, ''));
}

function sanitize(s: string): string {
  return s.replace(/<[^>]*>/g, '').trim();
}

function parseDate(raw: string): Date {
  const [day, month, year] = raw.split('-');
  return new Date(`${year}-${month}-${day}T00:00:00Z`);
}

function makeRef(valueDate: string, description: string, amount: number): string {
  return createHash('sha256')
    .update(`${valueDate}|${description}|${amount}`)
    .digest('hex');
}

export async function parseDfcuPdf(buffer: Buffer): Promise<ParsedTransaction[]> {
  const data = await pdfParse(buffer);
  const lines = data.text.split('\n');
  const results: ParsedTransaction[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = DATE_RE.exec(line);
    if (!match) continue;

    const [, , valueDate, rawDesc, col4, col5] = match;
    const description = sanitize(rawDesc);

    // Skip header rows
    if (description.toLowerCase().includes('description') || description.toLowerCase().includes('balance')) continue;

    // B2W transfers are captured in MoMo — skip to avoid double-counting
    if (/^B2W-256/i.test(description)) continue;

    let debit = 0;
    let credit = 0;

    // The PDF layout has debit before credit; we heuristically pick
    // by checking if either cell value looks like a debit or credit
    if (col4 && col5) {
      debit = parseAmount(col4);
      credit = parseAmount(col5);
    } else if (col4) {
      // Only one amount column present — determine by context
      const amount = parseAmount(col4);
      if (/EFT-RAISING THE VILLAGE|SALARY|CREDIT/i.test(description)) {
        credit = amount;
      } else {
        debit = amount;
      }
    }

    if (debit === 0 && credit === 0) continue;

    const amount = credit > 0 ? credit : debit;
    let type: 'INCOME' | 'EXPENSE' | 'TRANSFER';

    if (credit > 0) {
      type = 'INCOME';
    } else {
      type = 'EXPENSE';
    }

    results.push({
      date: parseDate(valueDate),
      description,
      amount,
      type,
      externalRef: makeRef(valueDate, description, amount),
      importSource: 'DFCU_PDF',
    });
  }

  return results;
}
