import ExcelJS from 'exceljs';

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  externalRef: string;
  importSource: 'MOMO_XLSX';
}

const OWNER = 'GEORGE OWEN KIVUMBI';
const DFCU_FROM = 'DFCU BANK LIMITED KIVUMBI';

export async function parseMomoXlsx(buffer: Buffer): Promise<ParsedTransaction[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);

  const ws = wb.worksheets[0];
  if (!ws) return [];

  const results: ParsedTransaction[] = [];

  ws.eachRow((row, n) => {
    if (n === 1) return; // skip header

    const dateRaw = row.getCell(1).value;
    const txId = row.getCell(2).value;
    const txType = String(row.getCell(3).value ?? '').trim();
    const desc = String(row.getCell(4).value ?? '').trim();
    const from = String(row.getCell(5).value ?? '').trim();
    const to = String(row.getCell(6).value ?? '').trim();
    const amountRaw = row.getCell(7).value;

    if (!txId || !amountRaw) return;

    const amount = typeof amountRaw === 'number' ? amountRaw : parseFloat(String(amountRaw).replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) return;

    // Skip B2W transfers (bank→wallet) — already captured in DFCU import
    if (from === DFCU_FROM) return;

    let type: 'INCOME' | 'EXPENSE';
    if (to === OWNER) {
      type = 'INCOME';
    } else if (from === OWNER) {
      type = 'EXPENSE';
    } else {
      return; // unrecognised party, skip
    }

    // Build a readable description
    const counterparty = type === 'INCOME' ? from : to;
    const label = desc && desc !== String(txId) ? desc : txType;
    const description = counterparty && counterparty !== OWNER
      ? `${label} - ${counterparty}`
      : label;

    // Parse ISO date string or ExcelJS Date object
    let date: Date;
    if (dateRaw instanceof Date) {
      date = dateRaw;
    } else {
      date = new Date(String(dateRaw));
      if (isNaN(date.getTime())) date = new Date();
    }

    results.push({
      date,
      description,
      amount,
      type,
      externalRef: `momo:${String(txId).trim()}`,
      importSource: 'MOMO_XLSX',
    });
  });

  return results;
}
