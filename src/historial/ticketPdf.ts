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

export interface ComprobanteConfig {
  fiscal: {
    razon_social: string;
    rfc: string;
    codigo_postal: string;
    regimen_fiscal: string;
    domicilio_fiscal: string;
    telefono: string;
    correo: string;
    representante_legal: string;
  };
  tickets: {
    titulo_comprobante: string;
    pie_pagina: string;
    mostrar_datos_fiscales: boolean;
  };
}

const DEFAULT_CONFIG: ComprobanteConfig = {
  fiscal: {
    razon_social: "Colegio San Ignacio A.C.",
    rfc: "CSI990101XX1",
    codigo_postal: "10004",
    regimen_fiscal: "603",
    domicilio_fiscal: "Av. Educación 123, Col. Centro, Ciudad, Estado.",
    telefono: "+52 (55) 1234-5678",
    correo: "administracion@colegio.edu",
    representante_legal: "Dra. Elena Ramos",
  },
  tickets: {
    titulo_comprobante: "Comprobante de operación",
    pie_pagina: "Documento administrativo generado desde el historial.",
    mostrar_datos_fiscales: true,
  }
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

function createPdf(commands: string) {
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
  config: ComprobanteConfig = DEFAULT_CONFIG,
) {
  const cmd: string[] = [];

  const setFillColor = (r: number, g: number, b: number) => {
    cmd.push(`${r} ${g} ${b} rg`);
  };
  const setStrokeColor = (r: number, g: number, b: number) => {
    cmd.push(`${r} ${g} ${b} RG`);
  };
  const drawRect = (x: number, y: number, w: number, h: number, fill = true, stroke = false) => {
    cmd.push(`${x} ${y} ${w} ${h} re`);
    if (fill && stroke) cmd.push("B");
    else if (fill) cmd.push("f");
    else if (stroke) cmd.push("S");
  };
  const drawLine = (x1: number, y1: number, x2: number, y2: number, width = 1) => {
    cmd.push(`${width} w`);
    cmd.push(`${x1} ${y1} m ${x2} ${y2} l S`);
  };
  const drawText = (text: string, x: number, y: number, bold = false, size = 10) => {
    const font = bold ? "F2" : "F1";
    cmd.push(`BT /${font} ${size} Tf ${x} ${y} Td (${cleanPdfText(text)}) Tj ET`);
  };

  // Start coordinates calculation
  let y = 740;

  // 1. Top Header Bar (Razón Social or Brand Name)
  const headerText = config.fiscal.razon_social || "SI.CCO";
  setFillColor(0.15, 0.23, 0.43); // Dark Navy Blue
  drawRect(48, y - 10, 516, 40, true, false);
  
  // Text inside Navy Bar
  setFillColor(1, 1, 1);
  drawText(headerText, 60, y + 2, true, 13);
  y -= 45;

  // 2. Subtitle (Document Title)
  setFillColor(0.2, 0.2, 0.2);
  drawText(config.tickets.titulo_comprobante.toUpperCase(), 48, y, true, 11);
  y -= 12;

  // Thin separator
  setStrokeColor(0.8, 0.8, 0.8);
  drawLine(48, y, 564, y, 1);
  y -= 20;

  // 3. Metadata columns
  // Left Column: Trans details
  setFillColor(0.3, 0.3, 0.3);
  drawText("DETALLES DEL MOVIMIENTO", 48, y, true, 8.5);
  
  setFillColor(0.1, 0.1, 0.1);
  drawText(`Folio: ${transaction.serieFolio}`, 48, y - 16, true, 9.5);
  drawText(`Fecha: ${transaction.date}`, 48, y - 28, false, 9);
  drawText(`Cliente: ${transaction.client || "Publico General"}`, 48, y - 40, false, 9);
  drawText(`Tipo: ${transaction.type}`, 48, y - 52, false, 9);
  
  // Right Column: Issuer Fiscal/Contact Details (if checked)
  if (config.tickets.mostrar_datos_fiscales) {
    setFillColor(0.3, 0.3, 0.3);
    drawText("DATOS EMISOR", 320, y, true, 8.5);

    setFillColor(0.1, 0.1, 0.1);
    drawText(config.fiscal.razon_social, 320, y - 16, true, 9);
    drawText(`RFC: ${config.fiscal.rfc}`, 320, y - 28, false, 9);
    drawText(`Regimen Fiscal: ${config.fiscal.regimen_fiscal}`, 320, y - 40, false, 9);
    
    // Address splitting for layout safety
    const address = config.fiscal.domicilio_fiscal;
    let addLine1 = address;
    let addLine2 = "";
    if (address.length > 42) {
      const splitIndex = address.lastIndexOf(" ", 42);
      if (splitIndex > 10) {
        addLine1 = address.substring(0, splitIndex);
        addLine2 = address.substring(splitIndex + 1);
      } else {
        addLine1 = address.substring(0, 40);
        addLine2 = address.substring(40);
      }
    }
    
    drawText(`Direccion: ${addLine1}`, 320, y - 52, false, 9);
    if (addLine2) {
      drawText(addLine2, 368, y - 64, false, 9);
      drawText(`CP: ${config.fiscal.codigo_postal}  Tel: ${config.fiscal.telefono}`, 320, y - 76, false, 9);
      drawText(`Correo: ${config.fiscal.correo}`, 320, y - 88, false, 9);
      y -= 95;
    } else {
      drawText(`CP: ${config.fiscal.codigo_postal}  Tel: ${config.fiscal.telefono}`, 320, y - 64, false, 9);
      drawText(`Correo: ${config.fiscal.correo}`, 320, y - 76, false, 9);
      y -= 85;
    }
  } else {
    y -= 60;
  }

  y -= 25;

  // 4. Concepts Table Header
  setFillColor(0.95, 0.95, 0.95);
  drawRect(48, y - 6, 516, 20, true, false);

  setFillColor(0.2, 0.2, 0.2);
  drawText("DESCRIPCION", 56, y, true, 8.5);
  drawText("CANTIDAD", 360, y, true, 8.5);
  drawText("PRECIO UNIT.", 430, y, true, 8.5);
  drawText("IMPORTE", 510, y, true, 8.5);
  
  setStrokeColor(0.8, 0.8, 0.8);
  drawLine(48, y - 6, 564, y - 6, 1);
  y -= 22;

  // 5. Render Concepts Rows
  const details = operationDetail?.detalles || [];
  
  const drawRow = (desc: string, qty: number, price: number) => {
    setFillColor(0.15, 0.15, 0.15);
    drawText(desc, 56, y, false, 9);
    drawText(String(qty), 360, y, false, 9);
    drawText(money(price), 430, y, false, 9);
    drawText(money(qty * price), 510, y, false, 9);
    
    setStrokeColor(0.9, 0.9, 0.9);
    drawLine(48, y - 6, 564, y - 6, 0.5);
    y -= 18;
  };

  if (details.length) {
    details.slice(0, 18).forEach((detail) => {
      const qty = Number(detail.cantidad || 1);
      const desc = detail.descripcion || transaction.concept || "Concepto administrativo";
      const totalItem = (detail as any).importe_total != null ? Number((detail as any).importe_total) : transaction.amount;
      const unitPrice = qty > 0 ? totalItem / qty : totalItem;
      drawRow(desc, qty, unitPrice);
    });
  } else {
    const qty = 1;
    const desc = transaction.concept || "Operacion administrativa";
    const unitPrice = transaction.amount;
    drawRow(desc, qty, unitPrice);
  }

  y -= 10;

  // 6. Summary / Total Area
  setStrokeColor(0.7, 0.7, 0.7);
  drawLine(48, y, 564, y, 1.5);
  y -= 22;

  // Total
  setFillColor(0.15, 0.23, 0.43);
  drawText("TOTAL A PAGAR:", 380, y, true, 10.5);
  drawText(money(transaction.amount), 500, y, true, 12);
  y -= 25;

  // 7. Payment details
  const payments = (operationDetail?.pagos || []).filter((p) => p.tipo_movimiento === "PAGO");
  setFillColor(0.3, 0.3, 0.3);
  drawText("METODO(S) DE PAGO", 48, y, true, 8.5);
  y -= 16;
  
  setFillColor(0.1, 0.1, 0.1);
  if (payments.length) {
    payments.forEach((payment) => {
      drawText(`${payment.metodo_pago.toUpperCase()}: ${money(payment.monto_pagado)}`, 48, y, false, 9);
      y -= 14;
    });
  } else {
    drawText(`${transaction.paymentMethod || "Sin especificar"}`, 48, y, false, 9);
    y -= 14;
  }

  // 8. Status & Remarks
  y -= 10;
  if (transaction.status === "ANULADA") {
    setFillColor(0.8, 0.1, 0.1);
    drawText("ESTADO: ANULADA", 48, y, true, 10);
    y -= 14;
    drawText(`Motivo de anulacion: ${transaction.cancellationReason || "Sin detalle"}`, 48, y, false, 9);
    y -= 14;
  } else {
    setFillColor(0.15, 0.55, 0.3);
    drawText("ESTADO: COMPLETADO", 48, y, true, 10);
    y -= 14;
  }

  if (transaction.observation) {
    setFillColor(0.3, 0.3, 0.3);
    drawText("OBSERVACIONES:", 48, y, true, 8.5);
    y -= 14;
    setFillColor(0.15, 0.15, 0.15);
    drawText(transaction.observation, 48, y, false, 9);
    y -= 14;
  }

  // 9. Footer (Fixed at the bottom of the page)
  setStrokeColor(0.8, 0.8, 0.8);
  drawLine(48, 70, 564, 70, 0.5);
  setFillColor(0.4, 0.4, 0.4);
  drawText(config.tickets.pie_pagina, 48, 52, false, 8);

  // Generate and download
  const commandsStr = cmd.join("\n");
  const url = URL.createObjectURL(createPdf(commandsStr));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ticket-${transaction.serieFolio || "operacion"}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
