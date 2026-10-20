import { jsPDF } from 'jspdf';
import { COMPANY_ADDRESS_LINE, COMPANY_LEGAL_NAME } from '@/lib/company';

export type Align = 'left' | 'right' | 'center';

export interface Column {
  header: string;
  width: number;
  align?: Align;
}

const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const ROW_H = 6;

/** Thin A4 layout helper: repeated table headers, automatic page breaks, page-numbered footer. */
export class PdfWriter {
  readonly doc: jsPDF;
  private y = 0;
  private title: string;
  private subtitle: string;
  private generatedAt: string;

  constructor(title: string, subtitle: string, generatedAt: string, orientation: 'p' | 'l' = 'p') {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4', orientation });
    this.title = title;
    this.subtitle = subtitle;
    this.generatedAt = generatedAt;
    this.doc.setProperties({ title, subject: subtitle, author: COMPANY_LEGAL_NAME, creator: COMPANY_LEGAL_NAME });
    this.header();
  }

  private get pageW() {
    return this.doc.internal.pageSize.getWidth();
  }
  private get pageH() {
    return this.doc.internal.pageSize.getHeight();
  }

  private header() {
    const d = this.doc;
    d.setFont('helvetica', 'bold').setFontSize(15).setTextColor(20);
    d.text(this.title, MARGIN, 18);
    d.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90);
    d.text(this.subtitle, MARGIN, 24);
    d.text(COMPANY_LEGAL_NAME, this.pageW - MARGIN, 14, { align: 'right' });
    d.text(COMPANY_ADDRESS_LINE, this.pageW - MARGIN, 18.5, { align: 'right' });
    d.setDrawColor(200).line(MARGIN, 28, this.pageW - MARGIN, 28);
    d.setTextColor(0);
    this.y = 35;
  }

  private ensure(height: number, columns?: Column[]) {
    if (this.y + height <= this.pageH - 18) return;
    this.doc.addPage();
    this.header();
    if (columns) this.tableHeader(columns);
  }

  heading(text: string) {
    this.ensure(12);
    this.doc.setFont('helvetica', 'bold').setFontSize(11).text(text, MARGIN, this.y);
    this.y += 6;
  }

  paragraph(text: string, size = 9) {
    this.doc.setFont('helvetica', 'normal').setFontSize(size);
    const lines = this.doc.splitTextToSize(text, this.pageW - 2 * MARGIN) as string[];
    lines.forEach((line) => {
      this.ensure(5);
      this.doc.text(line, MARGIN, this.y);
      this.y += 4.5;
    });
    this.y += 1.5;
  }

  keyValues(pairs: [string, string][]) {
    this.doc.setFontSize(9);
    pairs.forEach(([k, v]) => {
      this.ensure(5);
      this.doc.setFont('helvetica', 'bold').text(`${k}:`, MARGIN, this.y);
      this.doc.setFont('helvetica', 'normal').text(v, MARGIN + 42, this.y);
      this.y += 5;
    });
    this.y += 2;
  }

  private tableHeader(columns: Column[]) {
    const d = this.doc;
    d.setFillColor(235, 235, 235).rect(MARGIN, this.y - 4.2, columns.reduce((a, c) => a + c.width, 0), ROW_H, 'F');
    d.setFont('helvetica', 'bold').setFontSize(8.5);
    this.cells(columns, columns.map((c) => c.header));
    this.y += ROW_H;
  }

  private cells(columns: Column[], values: string[]) {
    let x = MARGIN;
    columns.forEach((col, i) => {
      const raw = values[i] ?? '';
      let text = raw;
      const maxW = col.width - 2;
      while (text.length > 1 && this.doc.getTextWidth(text) > maxW) text = text.slice(0, -1);
      if (text !== raw) text = `${text.slice(0, -1)}.`;
      const tx = col.align === 'right' ? x + col.width - 1 : col.align === 'center' ? x + col.width / 2 : x + 1;
      this.doc.text(text, tx, this.y, { align: col.align ?? 'left' });
      x += col.width;
    });
  }

  table(columns: Column[], rows: string[][], options: { totalRow?: string[] } = {}) {
    this.ensure(ROW_H * 2);
    this.tableHeader(columns);
    this.doc.setFont('helvetica', 'normal').setFontSize(8.5);
    rows.forEach((row) => {
      this.ensure(ROW_H, columns);
      this.doc.setFont('helvetica', 'normal').setFontSize(8.5);
      this.cells(columns, row);
      this.doc.setDrawColor(230).line(MARGIN, this.y + 1.8, MARGIN + columns.reduce((a, c) => a + c.width, 0), this.y + 1.8);
      this.y += ROW_H;
    });
    if (options.totalRow) {
      this.ensure(ROW_H, columns);
      this.doc.setFont('helvetica', 'bold').setFontSize(8.5);
      this.doc.setDrawColor(120).line(MARGIN, this.y - 3.8, MARGIN + columns.reduce((a, c) => a + c.width, 0), this.y - 3.8);
      this.cells(columns, options.totalRow);
      this.y += ROW_H;
    }
    this.y += 3;
  }

  signatureBlock(labels: string[]) {
    this.ensure(28);
    this.y += 14;
    const width = (this.pageW - 2 * MARGIN) / labels.length;
    labels.forEach((label, i) => {
      const x = MARGIN + i * width;
      this.doc.setDrawColor(80).line(x, this.y, x + width - 8, this.y);
      this.doc.setFont('helvetica', 'normal').setFontSize(8).text(label, x, this.y + 4);
    });
    this.y += 10;
  }

  finish(): Uint8Array {
    const pages = this.doc.getNumberOfPages();
    for (let p = 1; p <= pages; p += 1) {
      this.doc.setPage(p);
      this.doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(120);
      this.doc.text(`Erstellt am ${this.generatedAt}`, MARGIN, this.pageH - 8);
      this.doc.text(`Seite ${p} / ${pages}`, this.pageW - MARGIN, this.pageH - 8, { align: 'right' });
    }
    return new Uint8Array(this.doc.output('arraybuffer'));
  }
}

export { MARGIN, PAGE_W, PAGE_H };
