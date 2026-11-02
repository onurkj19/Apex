import { toCsv } from '../csv';
import type { ReportModel } from './models';
import { PdfWriter } from './writer';

export const renderPdf = (model: ReportModel, generatedAt = new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })): Uint8Array => {
  const writer = new PdfWriter(model.title, model.subtitle, generatedAt, model.landscape ? 'l' : 'p');
  writer.keyValues(model.meta);
  writer.table(model.columns, model.rows, { totalRow: model.totalRow });
  if (model.note) writer.paragraph(model.note, 8);
  if (model.signatures) writer.signatureBlock(model.signatures);
  return writer.finish();
};

export const renderCsv = (model: ReportModel): string =>
  toCsv([model.columns.map((c) => c.header), ...model.rows, ...(model.totalRow ? [model.totalRow] : [])]);

export const downloadBlob = (data: Uint8Array | string, filename: string, mime: string) => {
  const blob = new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadPdf = (model: ReportModel) => downloadBlob(renderPdf(model), `${model.filename}.pdf`, 'application/pdf');
export const downloadCsv = (model: ReportModel) => downloadBlob(renderCsv(model), `${model.filename}.csv`, 'text/csv;charset=utf-8');
