import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── NOTE: jsPDF built-in fonts don't support ₹ — using "Rs." ───
const RS = 'Rs.';

const C = {
  navy:   [10, 22, 40],
  gold:   [201, 168, 76],
  goldL:  [226, 201, 126],
  white:  [255, 255, 255],
  gray:   [136, 150, 168],
  light:  [245, 240, 232],
  red:    [233, 69, 96],
  green:  [46, 125, 50],
  border: [212, 184, 106],
  dark:   [30, 30, 30],
  alt:    [253, 250, 243],
};

const COMPANY = {
  name:    'DEVELOPMENT EXPRESS',
  tagline: 'THE GOLD STANDARD OF INFRASTRUCTURE',
  md:      'Om Chavan | B.Tech (Civil) | Managing Director',
  addr:    'Karad, Satara, Maharashtra - 415110',
  phone:   '+91-9766926636',
  email:   'om.chavan2026@zohomail.in',
  gstin:   '27ABCDE1234F1Z5',
  pan:     'ABCDE1234F',
  bank:    'State Bank of India',
  acno:    '12345678901',
  ifsc:    'SBIN0001234',
  branch:  'Karad Main Branch',
  upi:     'devexpress@sbi',
};

function money(n) { return `${RS} ${Number(n).toLocaleString('en-IN')}`; }
function pct(n, p) { return Math.round(n * p / 100); }

// ─── HEADER ───
function drawHeader(doc, title, sub) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, 55, 'F');
  doc.setFillColor(...C.gold);
  doc.rect(0, 0, W, 1.5, 'F');

  // Logo circle
  doc.setFillColor(...C.gold);
  doc.circle(20, 18, 10, 'F');
  doc.setFillColor(...C.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.navy);
  doc.text('DE', 20, 21, { align: 'center' });

  // Company
  doc.setTextColor(...C.goldL);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY.name, 34, 13);
  doc.setTextColor(...C.gold);
  doc.setFontSize(6.5);
  doc.text(COMPANY.tagline, 34, 18);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(COMPANY.md, 34, 23);
  doc.text(COMPANY.addr, 34, 28);
  doc.text(`${COMPANY.phone}   ${COMPANY.email}`, 34, 33);

  // Right
  doc.setTextColor(...C.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`GSTIN: ${COMPANY.gstin}`, W - 10, 13, { align: 'right' });
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`PAN: ${COMPANY.pan}`, W - 10, 18, { align: 'right' });
  doc.text('State: Maharashtra (27)', W - 10, 23, { align: 'right' });

  // Title band
  doc.setFillColor(...C.gold);
  doc.rect(0, 40, W, 15, 'F');
  doc.setTextColor(...C.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, W / 2, 49, { align: 'center' });
  doc.setFontSize(7);
  doc.text(sub, W / 2, 54, { align: 'center' });
}

// ─── META BAR ───
function drawMeta(doc, items) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...C.navy);
  doc.rect(0, 56, W, 16, 'F');
  items.forEach(([label, val, x]) => {
    doc.setTextColor(...C.gold);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(label, x, 62);
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(String(val), x, 69);
  });
}

// ─── INFO BOX ───
function drawInfoBox(doc, x, y, w, h, title, rows) {
  doc.setFillColor(...C.light);
  doc.rect(x, y, w, h, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.rect(x, y, w, h, 'S');
  doc.setFillColor(...C.navy);
  doc.rect(x, y, w, 8, 'F');
  doc.setTextColor(...C.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(title, x + 3, y + 5.5);
  rows.forEach(([k, v], i) => {
    const ry = y + 12 + i * 6;
    doc.setTextColor(...C.gray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(k, x + 3, ry);
    doc.setTextColor(...C.dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(String(v), x + 28, ry);
  });
}

// ─── TOTALS BLOCK ───
function drawTotals(doc, y, rows, finalLabel, finalVal) {
  const W = doc.internal.pageSize.getWidth();
  const tx = 125, tw = W - tx - 10;
  rows.forEach(([label, val, bg, vc]) => {
    doc.setFillColor(...bg);
    doc.rect(tx, y, tw, 8, 'F');
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.rect(tx, y, tw, 8, 'S');
    doc.setTextColor(...C.gray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(label, tx + 3, y + 5.5);
    doc.setTextColor(...vc);
    doc.setFont('helvetica', 'bold');
    doc.text(val, W - 12, y + 5.5, { align: 'right' });
    y += 8;
  });
  // Final row
  doc.setFillColor(...C.navy);
  doc.rect(tx, y + 1, tw, 12, 'F');
  doc.setTextColor(...C.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(finalLabel, tx + 3, y + 9);
  doc.text(finalVal, W - 12, y + 9, { align: 'right' });
  return y + 14;
}

// ─── FOOTER ───
function drawFooter(doc, label) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(...C.navy);
  doc.rect(0, H - 14, W, 14, 'F');
  doc.setFillColor(...C.gold);
  doc.rect(0, H - 14, W, 0.5, 'F');
  doc.setTextColor(...C.goldL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`Development Express  |  The Gold Standard of Infrastructure`, W / 2, H - 8.5, { align: 'center' });
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`${COMPANY.phone}  |  ${COMPANY.email}  |  Karad, Satara  |  Since 2011`, W / 2, H - 4.5, { align: 'center' });
  doc.setTextColor(...C.gold);
  doc.setFontSize(6);
  doc.text(`${label}  |  Generated: ${new Date().toLocaleString('en-IN')}`, W / 2, H - 1.5, { align: 'center' });
}

// ─── WATERMARK ───
// eslint-disable-next-line no-unused-vars
function drawWatermark(doc, text) {}

// ══════════════════════════════════════════════
// 1. GST INVOICE
// ══════════════════════════════════════════════
export function generateGSTInvoice(booking) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  drawHeader(doc, 'TAX INVOICE', '(Original for Recipient)');
  drawMeta(doc, [
    ['Invoice No.:', booking.invoiceNo || 'DE/INV/2026/041001', 10],
    ['Invoice Date:', booking.invoiceDate || new Date().toLocaleDateString('en-IN'), 65],
    ['Booking ID:', booking.bookingId || 'BK-2026-041001', 120],
    ['Due Date:', booking.dueDate || '20 days', 168],
  ]);

  // Info boxes
  const bw = (W - 25) / 2;
  drawInfoBox(doc, 10, 75, bw, 42, 'BILL TO — CLIENT', [
    ['Name:', booking.clientName || 'Patil Builders Pvt. Ltd.'],
    ['Address:', booking.clientAddr || 'Karad, Satara - 415110'],
    ['GSTIN:', booking.clientGST || '27AABCP1234A1Z5'],
    ['Phone:', booking.clientPhone || '+91-9876543210'],
    ['Email:', booking.clientEmail || 'billing@patilbuilders.com'],
  ]);
  drawInfoBox(doc, 15 + bw, 75, bw, 42, 'WORK SITE DETAILS', [
    ['Machine:', booking.machineName || 'JCB 3DX Backhoe Loader'],
    ['Reg. No.:', 'MH-09-AB-1234'],
    ['Operator:', booking.operator || 'Ramesh Kadam'],
    ['Location:', booking.location || 'Karad, Satara'],
    ['Period:', booking.workPeriod || '01-10 Apr 2026'],
  ]);

  // Table
  const base = booking.baseAmount || 105000;
  const gst = Math.round(base * 0.18);
  const total = base + gst;
  const adv = booking.advancePaid || 4200;
  const bal = total - adv;

  autoTable(doc, {
    startY: 121,
    head: [['Description', 'HSN', 'Qty/Hrs', 'Rate', 'Base Amount', 'GST 18%', 'Total']],
    body: [[
      { content: `${booking.machineName || 'JCB 3DX Backhoe Loader'}\nInclusive of Operator + Fuel`, styles: { fontStyle: 'bold', cellPadding: { top: 3, bottom: 3, left: 3, right: 2 } } },
      '9987',
      `${booking.hours || 75} hrs`,
      money(booking.ratePerHour || 1400),
      money(base),
      money(gst),
      money(total),
    ]],
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, valign: 'middle' },
    headStyles: { fillColor: C.navy, textColor: C.gold, fontStyle: 'bold', fontSize: 7.5, halign: 'center' },
    alternateRowStyles: { fillColor: C.alt },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 22, halign: 'right', textColor: C.red },
      6: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: C.green },
    },
    margin: { left: 10, right: 10 },
  });

  let y = doc.lastAutoTable.finalY + 6;

  // Totals
  y = drawTotals(doc, y, [
    ['Taxable Amount (Base):', money(base), C.light, C.dark],
    ['CGST @ 9%:', money(pct(base, 9)), [255, 243, 224], C.red],
    ['SGST @ 9%:', money(pct(base, 9)), [255, 243, 224], C.red],
    ['Advance Paid (Wallet):', `- ${money(adv)}`, [232, 245, 233], C.green],
  ], 'BALANCE DUE:', money(bal));

  // Bank details
  if (y > 220) { doc.addPage(); y = 15; }
  doc.setFillColor(...C.light);
  doc.rect(10, y, W - 20, 18, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.rect(10, y, W - 20, 18, 'S');
  doc.setFillColor(...C.navy);
  doc.rect(10, y, W - 20, 7, 'F');
  doc.setTextColor(...C.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('PAYMENT DETAILS — DEVELOPMENT EXPRESS', 13, y + 5);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Bank: ${COMPANY.bank}   A/C: ${COMPANY.acno}   IFSC: ${COMPANY.ifsc}`, 13, y + 12);
  doc.text(`Branch: ${COMPANY.branch}   UPI: ${COMPANY.upi}`, 13, y + 17);
  y += 22;

  // Wallet notice
  doc.setTextColor(...C.red);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Wallet-Only Policy: All payments via Platform Wallet. Cash not accepted.', 10, y + 4);
  y += 9;

  // Terms
  doc.setTextColor(...C.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Terms & Conditions:', 10, y + 4);
  doc.setTextColor(...C.gray);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  [
    '1. Payments strictly via Platform Wallet. No cash/direct transfer.',
    '2. Cancellation: 1 hr charge deducted as penalty. Balance credited to Wallet. No bank refund.',
    '3. Direct contact bypassing platform = Blacklisting & legal action.',
    '4. Subject to Karad, Satara, Maharashtra jurisdiction.',
  ].forEach((t, i) => doc.text(t, 10, y + 9 + i * 5));
  y += 32;

  // Signature
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(0.8);
  doc.line(W - 68, y + 5, W - 12, y + 5);
  doc.setTextColor(...C.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('For Development Express', W - 40, y + 10, { align: 'center' });
  doc.setTextColor(...C.gray);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Authorised Signatory — Om Chavan, MD', W - 40, y + 15, { align: 'center' });

  drawFooter(doc, 'GST Invoice | Original Copy');
  doc.save(`DE_GST_Invoice_${booking.bookingId || 'BK041001'}.pdf`);
}

// ══════════════════════════════════════════════
// 2. OWNER PAYMENT RECEIPT
// ══════════════════════════════════════════════
export function generateOwnerReceipt(booking) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  drawHeader(doc, 'MACHINE OWNER PAYMENT RECEIPT', '(Settlement Statement)');
  drawMeta(doc, [
    ['Receipt No.:', booking.receiptNo || 'DE/RCPT/OWN/2026/041001', 10],
    ['Payment Date:', booking.payDate || new Date().toLocaleDateString('en-IN'), 65],
    ['Settlement For:', booking.period || 'Apr 2026', 115],
    ['Booking Ref:', booking.bookingId || 'BK-2026-041001', 165],
  ]);

  const bw = (W - 25) / 2;
  drawInfoBox(doc, 10, 75, bw, 42, 'MACHINE OWNER DETAILS', [
    ['Name:', booking.ownerName || 'Rajesh Patil'],
    ['PAN:', booking.ownerPan || 'ABCDE1234F'],
    ['Aadhaar:', booking.ownerAadhaar || 'XXXX-XXXX-4521'],
    ['Bank A/C:', booking.ownerBank || 'SBI: 12345678901'],
    ['IFSC:', booking.ownerIfsc || 'SBIN0001234'],
  ]);
  drawInfoBox(doc, 15 + bw, 75, bw, 42, 'MACHINE & WORK DETAILS', [
    ['Machine:', booking.machineName || 'JCB 3DX Backhoe Loader'],
    ['Reg. No.:', booking.regNo || 'MH-09-AB-1234'],
    ['Type:', booking.machineType || 'Backhoe Loader'],
    ['Client:', booking.clientName || 'Patil Builders Pvt. Ltd.'],
    ['Period:', booking.workPeriod || '01-10 Apr 2026'],
  ]);

  const gross = booking.grossAmount || 105000;
  const commPct = booking.commissionPct || 15;
  const comm = pct(gross, commPct);
  const tds = pct(gross, 2);
  const gstTcs = pct(gross, 1);
  const net = gross - comm - tds - gstTcs;

  autoTable(doc, {
    startY: 121,
    head: [['Particulars', 'Calculation', 'Amount']],
    body: [
      [{ content: 'Gross Billing (Client Invoice)', styles: { fontStyle: 'bold' } }, `${booking.hours || 75} hrs x ${RS} ${booking.ratePerHour || 1400}/hr`, money(gross)],
      [{ content: `Development Express Commission (${commPct}%)`, styles: { fontStyle: 'bold' } }, `${money(gross)} x ${commPct}%`, `- ${money(comm)}`],
      [{ content: 'TDS Deduction (2% on Gross)', styles: { fontStyle: 'bold' } }, `${money(gross)} x 2%`, `- ${money(tds)}`],
      [{ content: 'GST TCS (1% on Gross)', styles: { fontStyle: 'bold' } }, `${money(gross)} x 1%`, `- ${money(gstTcs)}`],
    ],
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 5, valign: 'middle' },
    headStyles: { fillColor: C.navy, textColor: C.gold, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: C.alt },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 65 },
      2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 10, right: 10 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2 && data.row.index > 0) {
        data.cell.styles.textColor = C.red;
      }
      if (data.section === 'body' && data.column.index === 2 && data.row.index === 0) {
        data.cell.styles.textColor = C.green;
      }
    },
  });

  let y = doc.lastAutoTable.finalY + 6;

  // Net payable
  doc.setFillColor(44, 125, 50);
  doc.rect(10, y, W - 20, 14, 'F');
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('NET AMOUNT PAID TO OWNER:', 14, y + 9.5);
  doc.setTextColor(...C.gold);
  doc.setFontSize(13);
  doc.text(money(net), W - 12, y + 9.5, { align: 'right' });
  y += 18;

  // Payment mode box
  doc.setFillColor(...C.light);
  doc.rect(10, y, W - 20, 20, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.rect(10, y, W - 20, 20, 'S');
  doc.setFillColor(...C.navy);
  doc.rect(10, y, W - 20, 7, 'F');
  doc.setTextColor(...C.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('PAYMENT TRANSFER DETAILS', 13, y + 5);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Mode: NEFT/RTGS`, 13, y + 12);
  doc.text(`UTR: SBIN${Date.now().toString().slice(-10)}`, 55, y + 12);
  doc.text(`Date: ${booking.payDate || new Date().toLocaleDateString('en-IN')}`, 125, y + 12);
  doc.text(`Owner Bank: ${booking.ownerBank || 'SBI: 12345678901'}`, 13, y + 18);
  doc.text(`IFSC: ${booking.ownerIfsc || 'SBIN0001234'}`, 90, y + 18);
  y += 25;

  // Amount in words
  doc.setFillColor(...C.navy);
  doc.rect(10, y, W - 20, 10, 'F');
  doc.setTextColor(...C.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Amount in Words:', 13, y + 6.5);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(booking.words || 'Rupees Eighty Six Thousand One Hundred Only', 55, y + 6.5);
  y += 15;

  // Note
  doc.setTextColor(...C.gray);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('This receipt confirms full and final payment. TDS Form 16A will be issued quarterly.', 10, y + 5);
  doc.text('Development Express has deducted TDS & GST TCS as per Govt. of India regulations.', 10, y + 10);
  y += 18;

  // Signatures — 2 columns
  const sigPositions = [
    [W / 4, 'For Development Express', 'Om Chavan | MD'],
    [3 * W / 4, 'Owner Acknowledgement', booking.ownerName || 'Rajesh Patil'],
  ];
  sigPositions.forEach(([sx, label, name]) => {
    doc.setDrawColor(...C.navy);
    doc.setLineWidth(0.8);
    doc.line(sx - 28, y + 8, sx + 28, y + 8);
    doc.setTextColor(...C.navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, sx, y + 13, { align: 'center' });
    doc.setTextColor(...C.gray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(name, sx, y + 18, { align: 'center' });
  });

  drawFooter(doc, 'Owner Payment Receipt | Confidential');
  doc.save(`DE_Owner_Receipt_${booking.bookingId || 'BK041001'}.pdf`);
}

// ══════════════════════════════════════════════
// 3. INTERNAL LEDGER
// ══════════════════════════════════════════════
export function generateInternalLedger(booking) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  drawHeader(doc, 'INTERNAL TRANSACTION LEDGER', '(Confidential — Development Express Use Only)');
  drawMeta(doc, [
    ['Transaction ID:', booking.txnId || 'DE/TXN/INT/2026/041001', 10],
    ['Date:', booking.date || new Date().toLocaleDateString('en-IN'), 70],
    ['Booking Ref:', booking.bookingId || 'BK-2026-041001', 115],
    ['Prepared By:', 'Om Chavan | MD', 165],
  ]);

  const gross = booking.grossAmount || 105000;
  const commPct = booking.commissionPct || 15;
  const comm = pct(gross, commPct);
  const tds = pct(gross, 2);
  const gstTcs = pct(gross, 1);
  const gstPayable = pct(gross, 18);
  const ownerNet = gross - comm - tds - gstTcs;
  const clientTotal = gross + gstPayable;
  const compRev = comm;

  // Summary cards
  const cw = (W - 25) / 3;
  const cards = [
    ['CLIENT BILLED', money(clientTotal), booking.clientName || 'Patil Builders', C.green],
    ['OWNER PAID', money(ownerNet), booking.ownerName || 'Rajesh Patil', [21, 101, 192]],
    ['COMPANY REVENUE', money(compRev), 'Net Commission Income', C.gold],
  ];
  cards.forEach(([title, val, sub, vc], i) => {
    const cx = 10 + i * (cw + 2.5);
    doc.setFillColor(...C.navy);
    doc.rect(cx, 75, cw, 26, 'F');
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.8);
    doc.rect(cx, 75, cw, 26, 'S');
    doc.setTextColor(...C.gold);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(title, cx + cw / 2, 82, { align: 'center' });
    doc.setTextColor(...vc);
    doc.setFontSize(13);
    doc.text(val, cx + cw / 2, 91, { align: 'center' });
    doc.setTextColor(...C.gray);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(sub, cx + cw / 2, 97, { align: 'center' });
  });

  // Ledger table
  autoTable(doc, {
    startY: 105,
    head: [['Particulars', 'Party', 'Debit', 'Credit', 'Net']],
    body: [
      ['Client Invoice Raised', booking.clientName || 'Patil Builders', '', money(clientTotal), money(clientTotal)],
      [`Commission (${commPct}%)`, 'Development Express', money(comm), '', money(comm)],
      ['TDS Collected (2%)', 'Govt. of India', money(tds), '', money(tds)],
      ['GST TCS (1%)', 'Govt. of India', money(gstTcs), '', money(gstTcs)],
      ['Payment to Owner', booking.ownerName || 'Rajesh Patil', money(ownerNet), '', `- ${money(ownerNet)}`],
      ['GST Output Payable', 'GST Portal', money(gstPayable), '', `- ${money(gstPayable)}`],
    ],
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, valign: 'middle' },
    headStyles: { fillColor: C.navy, textColor: C.gold, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: C.alt },
    columnStyles: {
      0: { cellWidth: 65, fontStyle: 'bold' },
      1: { cellWidth: 45 },
      2: { cellWidth: 28, halign: 'right', textColor: C.red },
      3: { cellWidth: 28, halign: 'right', textColor: C.green },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 10, right: 10 },
  });

  let y = doc.lastAutoTable.finalY + 5;

  // Net revenue
  doc.setFillColor(...C.navy);
  doc.rect(10, y, W - 20, 12, 'F');
  doc.setTextColor(...C.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('NET COMPANY REVENUE (This Transaction):', 13, y + 8.5);
  doc.text(money(compRev), W - 12, y + 8.5, { align: 'right' });
  y += 17;

  // MTD Summary
  doc.setFillColor(...C.light);
  doc.rect(10, y, W - 20, 30, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.rect(10, y, W - 20, 30, 'S');
  doc.setFillColor(...C.navy);
  doc.rect(10, y, W - 20, 7, 'F');
  doc.setTextColor(...C.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('MONTH-TO-DATE SUMMARY — APRIL 2026', 13, y + 5);

  const mtd = [
    ['Total Client Billing:', money(321770), 13],
    ['Total Owner Payments:', money(245000), 75],
    ['Total Commission:', money(48266), 138],
  ];
  const mtd2 = [
    ['Total TDS Collected:', money(6435), 13],
    ['Total GST Output:', money(57919), 75],
    ['Net Company Profit:', money(48266), 138],
  ];
  mtd.forEach(([label, val, x]) => {
    doc.setTextColor(...C.gray); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text(label, x, y + 14);
    doc.setTextColor(...C.navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(val, x, y + 20);
  });
  mtd2.forEach(([label, val, x]) => {
    doc.setTextColor(...C.gray); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text(label, x, y + 24);
    doc.setTextColor(...C.navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(val, x, y + 30);
  });
  y += 36;

  // Confidential
  doc.setTextColor(...C.red);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CONFIDENTIAL: Internal use only. Not to be shared with any third party.', 10, y + 6);
  y += 14;

  // Signature
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(0.8);
  doc.line(W - 68, y + 6, W - 12, y + 6);
  doc.setTextColor(...C.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Verified & Approved', W - 40, y + 11, { align: 'center' });
  doc.setTextColor(...C.gray);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Om Chavan | Managing Director', W - 40, y + 16, { align: 'center' });

  drawFooter(doc, 'Internal Ledger | Strictly Confidential');
  doc.save(`DE_Internal_Ledger_${booking.bookingId || 'BK041001'}.pdf`);
}

// ══════════════════════════════════════════════
// 4. BOOKING HISTORY REPORT
// ══════════════════════════════════════════════
export function generateBookingReport(bookings, clientName) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  drawHeader(doc, 'BOOKING HISTORY REPORT', `Client: ${clientName}`);

  const totalBase = bookings.reduce((a, b) => a + (b.baseAmt || b.amount || 0), 0);
  const totalGST = Math.round(totalBase * 0.18);
  const totalAmt = totalBase + totalGST;

  autoTable(doc, {
    startY: 60,
    head: [['Booking ID', 'Date', 'Machine', 'Type', 'Hours', 'Base Amount', 'GST 18%', 'Total', 'Status']],
    body: bookings.map(b => [
      b.id,
      b.date,
      b.machine,
      b.type,
      `${b.hours} hrs`,
      money(b.baseAmt || b.amount || 0),
      money(Math.round((b.baseAmt || b.amount || 0) * 0.18)),
      money(b.total || Math.round((b.baseAmt || b.amount || 0) * 1.18)),
      b.status,
    ]),
    foot: [['', '', '', '', 'TOTAL', money(totalBase), money(totalGST), money(totalAmt), '']],
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, valign: 'middle' },
    headStyles: { fillColor: C.navy, textColor: C.gold, fontStyle: 'bold' },
    footStyles: { fillColor: C.navy, textColor: C.gold, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: C.alt },
    columnStyles: {
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 10, right: 10 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 8) {
        const st = data.cell.raw;
        if (st === 'Completed') data.cell.styles.textColor = C.green;
        else if (st === 'Active') data.cell.styles.textColor = [21, 101, 192];
        else data.cell.styles.textColor = [245, 127, 23];
      }
    },
  });

  drawFooter(doc, 'Booking History Report');
  doc.save(`DE_Booking_Report_${(clientName || 'Client').replace(/\s/g, '_')}.pdf`);
}



