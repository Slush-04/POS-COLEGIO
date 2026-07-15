interface TicketTransaction {
  serieFolio: string;
  date: string;
  client: string;
  type: string;
  concept: string;
  amount: number;
  paymentMethod: string;
  observation: string;
  status: string;
  cancellationReason?: string;
}

interface TicketOperationDetail {
  detalles?: Array<{ descripcion?: string; cantidad?: number; importe_total?: number }>;
  pagos?: Array<{ tipo_movimiento: string; monto_pagado: number; metodo_pago: string }>;
}

// Estos valores serán alimentados desde "Tickets y recibos" cuando se definan
// sus parámetros. Mantenerlos concentrados evita acoplar el PDF al modal.
export interface TicketPdfOptions {
  institutionName: string;
  documentTitle: string;
  footer: string;
}

const DEFAULT_OPTIONS: TicketPdfOptions = {
  institutionName: "SI.CCO",
  documentTitle: "Comprobante de operación",
  footer: "Documento administrativo generado desde el historial.",
};

const cleanPdfText = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^\x20-\x7E]/g, "?")
  .replace(/([\\()])/g, "\\$1");

const money = (value: number) => `$${Number(value || 0).toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

function createPdf(lines: Array<{ text: string; bold?: boolean; size?: number; gap?: number }>) {
  let y = 748;
  const commands = lines.map((line) => {
    const size = line.size || 10;
    const command = `BT /${line.bold ? "F2" : "F1"} ${size} Tf 48 ${y} Td (${cleanPdfText(line.text)}) Tj ET`;
    y -= line.gap || size + 7;
    return command;
  }).join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadTicketPdf(
  transaction: TicketTransaction,
  operationDetail: TicketOperationDetail | null,
  options: TicketPdfOptions = DEFAULT_OPTIONS,
) {
  const lines: Array<{ text: string; bold?: boolean; size?: number; gap?: number }> = [
    { text: options.institutionName, bold: true, size: 18, gap: 25 },
    { text: options.documentTitle, bold: true, size: 12, gap: 23 },
    { text: `Folio: ${transaction.serieFolio}`, bold: true },
    { text: `Fecha: ${transaction.date}` },
    { text: `Cliente: ${transaction.client || "Publico General"}` },
    { text: `Tipo: ${transaction.type}` },
    { text: `Estado: ${transaction.status}`, gap: 24 },
    { text: "Conceptos", bold: true },
  ];

  const details = operationDetail?.detalles || [];
  if (details.length) {
    details.slice(0, 18).forEach((detail) => lines.push({
      text: `${Number(detail.cantidad || 1)} x ${detail.descripcion || transaction.concept}${detail.importe_total != null ? `  ${money(detail.importe_total)}` : ""}`,
    }));
  } else {
    lines.push({ text: transaction.concept || "Operacion administrativa" });
  }

  lines.push({ text: `TOTAL: ${money(transaction.amount)}`, bold: true, size: 14, gap: 25 });
  const payments = (operationDetail?.pagos || []).filter((payment) => payment.tipo_movimiento === "PAGO");
  if (payments.length) {
    lines.push({ text: "Formas de pago", bold: true });
    payments.forEach((payment) => lines.push({ text: `${payment.metodo_pago}: ${money(payment.monto_pagado)}` }));
  } else {
    lines.push({ text: `Forma de pago: ${transaction.paymentMethod || "Sin pago"}` });
  }
  if (transaction.status === "ANULADA") lines.push({ text: `Motivo de anulacion: ${transaction.cancellationReason || "Sin detalle"}` });
  if (transaction.observation) lines.push({ text: `Observaciones: ${transaction.observation}` });
  lines.push({ text: options.footer, gap: 16 });

  const url = URL.createObjectURL(createPdf(lines));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ticket-${transaction.serieFolio || "operacion"}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
