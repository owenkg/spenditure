import ExcelJS from 'exceljs';

const CATEGORIES = [
  'food', 'transportation', 'bills', 'entertainment', 'accessories',
  'health', 'family', 'clothes', 'church', 'shopping', 'home',
  'work', 'escapades', 'others', 'salary', 'deposit', 'gifts',
];
const ACCOUNTS = ['Cash', 'Mobile Money', 'Bank', 'Savings'];
const TYPES    = ['expense', 'income', 'transfer'];
const HEADERS  = ['Date', 'Amount (UGX)', 'Type', 'Category', 'Account', 'Notes'];
const WIDTHS   = [16, 18, 13, 18, 17, 44];

const FOREST = 'FF1A2B22';
const AMBER  = 'FFB87212';
const LIGHT  = 'FFF5F0E8';
const WHITE  = 'FFFFFFFF';
const GRAY   = 'FFD1D5DB';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function fill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function bdr(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: GRAY } };
  return { left: side, right: side, top: side, bottom: side };
}

export async function buildLedgerTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Spenditure';

  // README sheet first so it appears as the first tab
  const readme = wb.addWorksheet('README');
  readme.getColumn(1).width = 75;
  readme.getCell('A1').value = 'Spenditure Personal Ledger — Template';
  readme.getCell('A1').font = { bold: true, size: 15, color: { argb: FOREST } };
  readme.getCell('A2').value = '';
  const instructions: [string, string][] = [
    ['Date',     'YYYY-MM-DD format (e.g. 2026-11-03). Required on every row.'],
    ['Amount',   'Positive whole number in UGX. No commas or currency symbols.'],
    ['Type',     'expense / income / transfer — pick from the dropdown.'],
    ['Category', 'Pick from dropdown. Use "others" if nothing fits.'],
    ['Account',  'Must match an account type in Spenditure (Cash, Mobile Money, Bank, Savings).'],
    ['Notes',    'Free text — what the money was for.'],
  ];
  instructions.forEach(([col, desc], i) => {
    readme.getCell(i + 3, 1).value = `${col}: ${desc}`;
    readme.getCell(i + 3, 1).font = { size: 11 };
  });
  readme.getCell('A11').value = '';
  readme.getCell('A12').value = 'Import: Spenditure → Settings → Import → Personal Ledger Spreadsheet';
  readme.getCell('A12').font  = { size: 11, italic: true, color: { argb: AMBER } };

  // Hidden lists sheet for dropdown sources
  const lists = wb.addWorksheet('_lists');
  lists.state = 'hidden';
  CATEGORIES.forEach((v, i) => { lists.getCell(i + 1, 1).value = v; });
  ACCOUNTS.forEach((v, i)   => { lists.getCell(i + 1, 2).value = v; });
  TYPES.forEach((v, i)      => { lists.getCell(i + 1, 3).value = v; });
  const catRef  = `_lists!$A$1:$A$${CATEGORIES.length}`;
  const acctRef = `_lists!$B$1:$B$${ACCOUNTS.length}`;
  const typeRef = `_lists!$C$1:$C$${TYPES.length}`;

  const year = new Date().getFullYear();

  for (let m = 0; m < 12; m++) {
    const ws = wb.addWorksheet(`${MONTHS[m]} ${year}`);
    ws.properties.defaultRowHeight = 20;

    // Title row
    ws.mergeCells('A1:F1');
    const title = ws.getCell('A1');
    title.value = `Spenditure Ledger — ${MONTHS[m]} ${year}`;
    title.font = { bold: true, color: { argb: WHITE }, size: 13 };
    title.fill = fill(FOREST);
    title.alignment = { horizontal: 'center' };
    ws.getRow(1).height = 28;

    // Header row
    HEADERS.forEach((h, i) => {
      const cell = ws.getCell(2, i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
      cell.fill = fill(AMBER);
      cell.alignment = { horizontal: 'center' };
      cell.border = bdr();
      ws.getColumn(i + 1).width = WIDTHS[i];
    });

    // Data rows
    for (let row = 3; row <= 102; row++) {
      for (let col = 1; col <= 6; col++) {
        const cell = ws.getCell(row, col);
        cell.border = bdr();
        if (row % 2 === 0) cell.fill = fill(LIGHT);
      }
      ws.getCell(row, 2).numFmt = '#,##0';
      ws.getCell(row, 1).alignment = { horizontal: 'center' };
    }

    // dataValidations exists at runtime but is absent from ExcelJS typings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dv = (ws as any).dataValidations;
    dv.add('C3:C102', { type: 'list', allowBlank: true, showDropDown: false, formulae: [typeRef] });
    dv.add('D3:D102', { type: 'list', allowBlank: true, showDropDown: false, formulae: [catRef] });
    dv.add('E3:E102', { type: 'list', allowBlank: true, showDropDown: false, formulae: [acctRef] });
    dv.add('B3:B102', {
      type: 'whole', operator: 'greaterThan', allowBlank: true, formulae: [0],
      showErrorMessage: true, error: 'Amount must be a positive whole number', errorTitle: 'Invalid amount',
    });

    ws.views = [{ state: 'frozen', ySplit: 2 }];
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
