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

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, ''));
}

function parseDate(raw: string): Date {
  const [day, month, year] = raw.split('-');
  return new Date(`${year}-${month}-${day}T12:00:00Z`);
}

function makeRef(date: string, description: string, amount: number): string {
  return createHash('sha256').update(`${date}|${description}|${amount}`).digest('hex');
}

function isPageHeader(line: string): boolean {
  const t = line.trim();
  return (
    /^Page \d+ of \d+/.test(t) ||
    t === 'STATEMENT OF ACCOUNT' ||
    /^Account (Name|Number|Currency)/.test(t) ||
    /^Address/.test(t) ||
    /^Branch/.test(t) ||
    /^Type of Account/.test(t) ||
    /^Statement Period/.test(t) ||
    /^BOOK BALANCE/.test(t) ||
    /^Opening Bal/.test(t) ||
    /^Closing Bal/.test(t) ||
    /^TRAN DATE/.test(t)
  );
}

/**
 * Extract amount and type from the content portion of a date+content line.
 * Debit: 2+ spaces before trailing amount.
 * CWDR (ATM): always debit even if no space separator.
 * Credit: amount directly concatenated after non-digit description char.
 */
function extractInlineAmount(
  content: string,
): { desc: string; amount: number; type: 'INCOME' | 'EXPENSE' } | null {
  const trimmed = content.trim();

  // Inter-account transfers — skip entirely (B2W captured in MoMo, W2B is the reverse)
  if (/^(B2W|W2B)-256/i.test(trimmed)) return null;

  // CWDR (cash withdrawal) is always an expense; some refs are short enough
  // that no space appears before the amount
  if (/^CWDR/i.test(trimmed)) {
    const m = trimmed.match(/([\d,]+\.\d{2})\s*$/);
    if (m) {
      return {
        desc: trimmed.slice(0, trimmed.length - m[0].length).trim(),
        amount: parseAmount(m[1]),
        type: 'EXPENSE',
      };
    }
  }

  // Debit: 2+ spaces before the trailing amount
  const debitMatch = content.match(/^(.+?)\s{2,}([\d,]+\.\d{2})\s*$/);
  if (debitMatch) {
    return { desc: debitMatch[1].trim(), amount: parseAmount(debitMatch[2]), type: 'EXPENSE' };
  }

  // Credit: amount concatenated directly after a non-digit, non-comma, non-space char
  const creditMatch = content.match(/^(.+?[^\d,\s])([\d,]+\.\d{2})\s*$/);
  if (creditMatch) {
    return { desc: creditMatch[1].trim(), amount: parseAmount(creditMatch[2]), type: 'INCOME' };
  }

  return null;
}

export async function parseDfcuPdf(buffer: Buffer): Promise<ParsedTransaction[]> {
  const data = await pdfParse(buffer);
  const rawLines = data.text.split('\n');

  const results: ParsedTransaction[] = [];

  let tranDate: string | null = null;
  let awaitingValueDate = false;
  let descParts: string[] = [];
  let amount: number | null = null;
  let type: 'INCOME' | 'EXPENSE' | null = null;

  function flush() {
    if (!tranDate || amount === null || !type) return;
    const description = descParts
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!description || amount <= 0) return;
    // Skip inter-account transfers (B2W/W2B captured via MoMo import)
    if (/^(B2W|W2B)-256/i.test(description)) return;

    results.push({
      date: parseDate(tranDate),
      description,
      amount,
      type,
      externalRef: makeRef(tranDate, description, amount),
      importSource: 'DFCU_PDF',
    });
  }

  function reset() {
    tranDate = null;
    awaitingValueDate = false;
    descParts = [];
    amount = null;
    type = null;
  }

  for (const rawLine of rawLines) {
    // trimEnd preserves leading spaces (needed for debit-amount detection)
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed || isPageHeader(line)) continue;

    // ── Debit amount on its own line: "  100,000.00"
    if (/^\s{2,}[\d,]+\.\d{2}\s*$/.test(line)) {
      amount = parseAmount(trimmed);
      type = 'EXPENSE';
      continue;
    }

    // ── Balance line (standalone decimal, no leading spaces): "6,409,578.00"
    if (/^\d{1,3}(?:,\d{3})*\.\d{2}$/.test(trimmed) && !line.startsWith(' ')) {
      flush();
      reset();
      continue;
    }

    // ── Date-only line: "DD-MM-YYYY"
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      if (tranDate === null) {
        tranDate = trimmed;
        awaitingValueDate = true;
      } else if (awaitingValueDate) {
        // Second date = value date; just mark it consumed
        awaitingValueDate = false;
      }
      continue;
    }

    // ── Date + content: "DD-MM-YYYYSome description  amount"
    const dateContentMatch = trimmed.match(/^(\d{2}-\d{2}-\d{4})(.+)$/);
    if (dateContentMatch) {
      if (tranDate === null) tranDate = dateContentMatch[1];
      awaitingValueDate = false;

      const extracted = extractInlineAmount(dateContentMatch[2]);
      if (extracted) {
        if (extracted.desc) descParts.push(extracted.desc);
        amount = extracted.amount;
        type = extracted.type;
      } else {
        descParts.push(dateContentMatch[2].trim());
      }
      continue;
    }

    // ── Description continuation (anything else)
    if (tranDate !== null) {
      descParts.push(trimmed);
    }
  }

  flush(); // handle any trailing transaction without a balance line

  return results;
}
