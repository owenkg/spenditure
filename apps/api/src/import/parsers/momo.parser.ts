import { simpleParser } from 'mailparser';

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  externalRef: string;
  importSource: 'MOMO_EML';
}

function sanitize(s: string): string {
  return s.replace(/<[^>]*>/g, '').trim();
}

function extractTableRows(html: string): string[][] {
  const rows: string[][] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRe.exec(html)) !== null) {
    const cells: string[] = [];
    let tdMatch: RegExpExecArray | null;
    const tdReg = new RegExp(tdRe.source, 'gi');
    while ((tdMatch = tdReg.exec(trMatch[1])) !== null) {
      cells.push(sanitize(tdMatch[1]));
    }
    if (cells.length >= 7) rows.push(cells);
  }

  return rows;
}

export async function parseMomoEml(buffer: Buffer): Promise<ParsedTransaction[]> {
  const parsed = await simpleParser(buffer);
  const html = parsed.html || '';
  if (!html) return [];

  const rows = extractTableRows(html);
  const results: ParsedTransaction[] = [];

  for (const row of rows) {
    // Columns: Date(0) / TxID(1) / Type(2) / Description(3) / From(4) / To(5) / Amount(6) / Fees(7) / Balance(8)
    const [dateStr, txId, , rawDesc, , toField, rawAmount] = row;

    if (!txId || txId.toLowerCase() === 'txid' || txId.toLowerCase() === 'transaction id') continue;

    const rawAmt = rawAmount ?? '';
    const numericStr = rawAmt.replace(/UGX\s*/i, '').replace(/,/g, '').trim();
    const signed = parseFloat(numericStr);
    if (isNaN(signed)) continue;

    const amount = Math.abs(signed);
    const description = sanitize(rawDesc);

    let type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    if (/transfer/i.test(description) && toField && toField.trim().length > 0) {
      type = 'TRANSFER';
    } else if (signed > 0) {
      type = 'INCOME';
    } else {
      type = 'EXPENSE';
    }

    // Parse date (format: DD/MM/YYYY HH:mm or DD-MM-YYYY)
    const dateParts = dateStr.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    const date = dateParts
      ? new Date(`${dateParts[3]}-${dateParts[2]}-${dateParts[1]}T00:00:00Z`)
      : new Date();

    results.push({
      date,
      description,
      amount,
      type,
      externalRef: txId.trim(),
      importSource: 'MOMO_EML',
    });
  }

  return results;
}
