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
  idCliente?: number | null;
  rfcCliente?: string | null;
}

interface TicketOperationDetail {
  detalles?: Array<{
    descripcion?: string;
    cantidad?: number;
    precio_unitario?: number;
    descuento?: number;
    iva?: number;
    importe_total?: number;
  }>;
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
    ubicacion_emisor?: "ARRIBA" | "ABAJO";
    alineacion_emisor?: "IZQUIERDA" | "CENTRO" | "DERECHA";
    alineacion_titulo?: "IZQUIERDA" | "CENTRO" | "DERECHA";
    plantilla?: "PLANTILLA_1" | "PLANTILLA_2";
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
    ubicacion_emisor: "ARRIBA",
    alineacion_emisor: "IZQUIERDA",
    alineacion_titulo: "IZQUIERDA",
    plantilla: "PLANTILLA_1",
  }
};

const cleanPdfText = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^\x20-\x7E]/g, "?")
  .replace(/([\\()])/g, "\\$1");

const wrapText = (text: string, maxLength = 80): string[] => {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  
  words.forEach((word) => {
    if ((currentLine + " " + word).length <= maxLength) {
      currentLine = currentLine ? currentLine + " " + word : word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
};

const getManualObservation = (obs: string) => {
  if (!obs) return "";
  const trimmed = obs.trim();
  if (trimmed.startsWith("Pago POS:")) {
    if (trimmed.includes(" - ")) {
      return trimmed.substring(trimmed.indexOf(" - ") + 3).trim();
    }
    return "";
  }
  return trimmed;
};

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
  const drawDottedLine = (x1: number, y1: number, x2: number, y2: number, r = 0.15, g = 0.23, b = 0.43, width = 1) => {
    cmd.push(`${r} ${g} ${b} RG`);
    cmd.push("[2 2] 0 d"); // pattern: 2 units drawn, 2 units off
    cmd.push(`${width} w`);
    cmd.push(`${x1} ${y1} m ${x2} ${y2} l S`);
    cmd.push("[] 0 d"); // turn off dashing
  };
  const drawText = (text: string, x: number, y: number, bold = false, size = 10) => {
    const font = bold ? "F2" : "F1";
    cmd.push(`BT /${font} ${size} Tf ${x} ${y} Td (${cleanPdfText(text)}) Tj ET`);
  };
  const drawTextAligned = (text: string, x: number, y: number, bold = false, size = 10, align: "IZQUIERDA" | "CENTRO" | "DERECHA" = "IZQUIERDA", containerWidth?: number) => {
    let finalX = x;
    const cleanStr = cleanPdfText(text);
    if (align === "CENTRO" || align === "DERECHA") {
      const textWidth = cleanStr.length * size * 0.52; // heuristic multiplier for Helvetica
      if (align === "CENTRO") {
        const center = containerWidth ? x + containerWidth / 2 : 306; // 306 is page center
        finalX = center - textWidth / 2;
      } else {
        const right = containerWidth ? x + containerWidth : 564; // 564 is right margin
        finalX = right - textWidth;
      }
    }
    const font = bold ? "F2" : "F1";
    cmd.push(`BT /${font} ${size} Tf ${finalX} ${y} Td (${cleanStr}) Tj ET`);
  };

  // Start coordinates calculation
  let y = 740;

  // Split date and time
  const dateStr = transaction.date || "";
  let displayDate = dateStr;
  let displayTime = "";
  if (dateStr.includes(" ")) {
    const parts = dateStr.split(" ");
    displayDate = parts[0];
    displayTime = parts[1];
  } else if (dateStr.includes("T")) {
    const parts = dateStr.split("T");
    displayDate = parts[0];
    displayTime = parts[1].split(/[+-Z]/)[0];
  }

  const activeTemplate = config.tickets.plantilla || "PLANTILLA_1";

  if (activeTemplate === "PLANTILLA_2") {
    // ----------------------------------------------------
    // PLANTILLA 2: DISEÑO MODERNO (Emisor centrado abajo)
    // ----------------------------------------------------

    // 1. Top Header Bar (Razón Social centered in bar)
    const headerText = config.fiscal.razon_social || "SI.CCO";
    setFillColor(0.15, 0.23, 0.43); // Dark Navy Blue
    drawRect(48, y - 10, 516, 40, true, false);
    
    setFillColor(1, 1, 1);
    drawTextAligned(headerText, 48, y + 2, true, 13, "CENTRO", 516);
    y -= 45;

    // 2. Logo Placeholder box on the left, and top-right Metadata
    // Logo block
    setFillColor(0.9, 0.9, 0.9); // Light Gray
    drawRect(48, y - 50, 120, 50, true, false);
    setFillColor(0.3, 0.3, 0.3);
    drawTextAligned("Logo de tu empresa", 48, y - 28, false, 8.5, "CENTRO", 120);

    // Folio, Fecha, Hora block (Right aligned)
    setFillColor(0.1, 0.1, 0.1);
    drawTextAligned(`Folio:  ${transaction.serieFolio}`, 564, y - 10, true, 10, "DERECHA");
    drawTextAligned(`Fecha:  ${displayDate}`, 564, y - 25, false, 9.5, "DERECHA");
    drawTextAligned(`Hora:  ${displayTime}`, 564, y - 40, false, 9.5, "DERECHA");

    y -= 65;

    // 3. Document Title
    setFillColor(0.15, 0.23, 0.43);
    drawTextAligned(config.tickets.titulo_comprobante.toUpperCase(), 48, y, true, 11, "IZQUIERDA");
    y -= 10;
    setStrokeColor(0.8, 0.8, 0.8);
    drawLine(48, y, 564, y, 1);
    y -= 20;

    // 4. Movement details
    setFillColor(0.3, 0.3, 0.3);
    drawText("DETALLES DEL MOVIMIENTO", 48, y, true, 8.5);
    y -= 16;

    setFillColor(0.1, 0.1, 0.1);
    const clientNum = transaction.idCliente ? String(transaction.idCliente) : "";
    drawText(`Numero de cliente: ${clientNum}`, 48, y, false, 9);
    y -= 12;
    drawText(`Cliente: ${transaction.client || "Público General"}`, 48, y, true, 9);
    y -= 12;
    drawText(`Tipo: ${transaction.type}`, 48, y, false, 9);
    y -= 12;
    
    const clientRfc = transaction.rfcCliente || "";
    drawText(`RFC: ${clientRfc}`, 48, y, false, 9);
    y -= 20;

  } else {
    // ----------------------------------------------------
    // PLANTILLA 1: DISEÑO CLÁSICO (Emisor arriba a la derecha)
    // ----------------------------------------------------

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
    drawTextAligned(config.tickets.titulo_comprobante.toUpperCase(), 48, y, true, 11, config.tickets.alineacion_titulo || "IZQUIERDA");
    y -= 12;

    // Thin separator
    setStrokeColor(0.8, 0.8, 0.8);
    drawLine(48, y, 564, y, 1);
    y -= 20;

    // 3. Metadata columns
    setFillColor(0.3, 0.3, 0.3);
    drawText("DETALLES DEL MOVIMIENTO", 48, y, true, 8.5);
    
    setFillColor(0.1, 0.1, 0.1);
    drawText(`Folio: ${transaction.serieFolio}`, 48, y - 16, true, 9.5);
    drawText(`Fecha: ${displayDate}`, 48, y - 28, false, 9);
    let metadataOffset = 28;
    if (displayTime) {
      drawText(`Hora: ${displayTime}`, 48, y - 40, false, 9);
      metadataOffset = 40;
    }
    drawText(`Cliente: ${transaction.client || "Publico General"}`, 48, y - metadataOffset - 12, false, 9);
    drawText(`Tipo: ${transaction.type}`, 48, y - metadataOffset - 24, false, 9);
    
    const showFiscal = config.tickets.mostrar_datos_fiscales;
    let rightColumnHeight = 0;
    if (showFiscal) {
      const align = config.tickets.alineacion_emisor || "IZQUIERDA";
      setFillColor(0.3, 0.3, 0.3);
      drawTextAligned("DATOS EMISOR", 320, y, true, 8.5, align, 244);

      setFillColor(0.1, 0.1, 0.1);
      drawTextAligned(config.fiscal.razon_social, 320, y - 16, true, 9, align, 244);
      drawTextAligned(`RFC: ${config.fiscal.rfc}`, 320, y - 28, false, 9, align, 244);
      drawTextAligned(`Regimen Fiscal: ${config.fiscal.regimen_fiscal}`, 320, y - 40, false, 9, align, 244);
      
      // Address splitting for layout safety
      const address = config.fiscal.domicilio_fiscal;
      let addLine1 = address;
      let addLine2 = "";
      if (address.length > 38) {
        const splitIndex = address.lastIndexOf(" ", 38);
        if (splitIndex > 10) {
          addLine1 = address.substring(0, splitIndex);
          addLine2 = address.substring(splitIndex + 1);
        } else {
          addLine1 = address.substring(0, 35);
          addLine2 = address.substring(35);
        }
      }
      
      drawTextAligned(`Direccion: ${addLine1}`, 320, y - 52, false, 9, align, 244);
      if (addLine2) {
        drawTextAligned(addLine2, 368, y - 64, false, 9, align, 244);
        drawTextAligned(`CP: ${config.fiscal.codigo_postal}  Tel: ${config.fiscal.telefono}`, 320, y - 76, false, 9, align, 244);
        drawTextAligned(`Correo: ${config.fiscal.correo}`, 320, y - 88, false, 9, align, 244);
        rightColumnHeight = 95;
      } else {
        drawTextAligned(`CP: ${config.fiscal.codigo_postal}  Tel: ${config.fiscal.telefono}`, 320, y - 64, false, 9, align, 244);
        drawTextAligned(`Correo: ${config.fiscal.correo}`, 320, y - 76, false, 9, align, 244);
        rightColumnHeight = 85;
      }
    }

    const leftColumnHeight = metadataOffset + 30;
    const maxColumnHeight = Math.max(leftColumnHeight, rightColumnHeight);
    y -= (maxColumnHeight + 15);
  }

  // ----------------------------------------------------
  // SECTION COMMON TO BOTH TEMPLATES
  // ----------------------------------------------------

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
      const totalItem = detail.importe_total != null ? Number(detail.importe_total) : transaction.amount;
      const unitPrice = detail.precio_unitario != null ? Number(detail.precio_unitario) : (qty > 0 ? totalItem / qty : totalItem);
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
  y -= 18;

  // Calculate totals
  let subtotal = 0;
  let discount = 0;
  let iva = 0;
  const total = transaction.amount;

  if (details.length) {
    details.forEach((det) => {
      const qty = Number(det.cantidad || 1);
      const price = det.precio_unitario != null ? Number(det.precio_unitario) : 0;
      subtotal += price * qty;
      discount += Number(det.descuento || 0);
      iva += Number(det.iva || 0);
    });
  } else {
    subtotal = total;
    discount = 0;
    iva = 0;
  }

  // Draw Breakdown on the right
  setFillColor(0.3, 0.3, 0.3);
  drawTextAligned("Importe:", 380, y, false, 9, "IZQUIERDA");
  drawTextAligned(money(subtotal), 564, y, false, 9, "DERECHA");
  y -= 14;

  drawTextAligned("Descuento:", 380, y, false, 9, "IZQUIERDA");
  drawTextAligned(money(discount), 564, y, false, 9, "DERECHA");
  y -= 14;

  drawTextAligned("IVA (16%):", 380, y, false, 9, "IZQUIERDA");
  drawTextAligned(money(iva), 564, y, false, 9, "DERECHA");
  y -= 14;

  setStrokeColor(0.8, 0.8, 0.8);
  drawLine(380, y + 4, 564, y + 4, 0.5);

  setFillColor(0.15, 0.23, 0.43);
  drawTextAligned("Total a Pagar:", 380, y - 10, true, 10.5, "IZQUIERDA");
  drawTextAligned(money(total), 564, y - 10, true, 12, "DERECHA");
  y -= 25;

  // 7. Payment details
  const payments = (operationDetail?.pagos || []).filter((p) => p.tipo_movimiento === "PAGO");
  
  const groupedPayments: { [method: string]: number } = {};
  if (payments.length) {
    payments.forEach((payment) => {
      const method = (payment.metodo_pago || "efectivo").toUpperCase();
      groupedPayments[method] = (groupedPayments[method] || 0) + Number(payment.monto_pagado || 0);
    });
  } else if (transaction.paymentMethod) {
    const method = transaction.paymentMethod.toUpperCase();
    groupedPayments[method] = transaction.amount;
  }

  setFillColor(0.3, 0.3, 0.3);
  drawText("METODO(S) DE PAGO", 48, y, true, 8.5);
  y -= 16;
  
  setFillColor(0.1, 0.1, 0.1);
  const paymentKeys = Object.keys(groupedPayments);
  if (paymentKeys.length) {
    paymentKeys.forEach((method) => {
      drawText(`${method}: ${money(groupedPayments[method])}`, 48, y, false, 9);
      y -= 14;
    });
  } else {
    drawText("Sin especificar", 48, y, false, 9);
    y -= 14;
  }

  y -= 5;

  // 8. Status
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

  y -= 10;

  // 9. Remarks / Manual Observations Box
  const manualObs = getManualObservation(transaction.observation);
  if (manualObs) {
    const wrappedLines = wrapText(manualObs, 95);
    const boxHeight = 25 + wrappedLines.length * 14;
    
    setStrokeColor(0.8, 0.8, 0.8);
    drawRect(48, y - boxHeight, 516, boxHeight, false, true);
    
    setFillColor(0.3, 0.3, 0.3);
    drawText("OBSERVACIONES", 56, y - 16, true, 8.5);
    
    setFillColor(0.15, 0.15, 0.15);
    wrappedLines.forEach((line, idx) => {
      drawText(line, 56, y - 32 - idx * 14, false, 9);
    });
    
    y -= (boxHeight + 15);
  }

  // 10. Emitter Data (Centered at bottom for PLANTILLA_2)
  const showFiscal = config.tickets.mostrar_datos_fiscales;
  if (showFiscal && activeTemplate === "PLANTILLA_2") {
    y -= 15;
    // Blue dotted divider line
    drawDottedLine(48, y, 564, y, 0.15, 0.23, 0.43, 1);
    y -= 18;

    setFillColor(0.15, 0.23, 0.43);
    // Emitter Name centered
    drawTextAligned(config.fiscal.razon_social, 48, y, true, 10, "CENTRO", 516);
    y -= 14;

    setFillColor(0.1, 0.1, 0.1);
    // RFC & Régimen
    const rfcRegimen = `RFC: ${config.fiscal.rfc}   |   Régimen Fiscal: ${config.fiscal.regimen_fiscal}`;
    drawTextAligned(rfcRegimen, 48, y, false, 9, "CENTRO", 516);
    y -= 14;

    // Address
    const address = `Dirección: ${config.fiscal.domicilio_fiscal}   CP: ${config.fiscal.codigo_postal}`;
    if (address.length > 80) {
      let line1 = address;
      let line2 = "";
      const splitIdx = address.lastIndexOf(" ", 80);
      if (splitIdx > 20) {
        line1 = address.substring(0, splitIdx);
        line2 = address.substring(splitIdx + 1);
      } else {
        line1 = address.substring(0, 75);
        line2 = address.substring(75);
      }
      drawTextAligned(line1, 48, y, false, 9, "CENTRO", 516);
      y -= 12;
      drawTextAligned(line2, 48, y, false, 9, "CENTRO", 516);
      y -= 14;
    } else {
      drawTextAligned(address, 48, y, false, 9, "CENTRO", 516);
      y -= 14;
    }

    // Tel & Email
    const telCorreo = `Tel: ${config.fiscal.telefono}   |   Correo: ${config.fiscal.correo}`;
    drawTextAligned(telCorreo, 48, y, false, 9, "CENTRO", 516);
    y -= 14;
  }

  // 11. Footer (Fixed at the bottom of the page)
  setStrokeColor(0.8, 0.8, 0.8);
  drawLine(48, 70, 564, 70, 0.5);
  setFillColor(0.4, 0.4, 0.4);
  const footerAlign = activeTemplate === "PLANTILLA_2" ? "CENTRO" : "IZQUIERDA";
  drawTextAligned(config.tickets.pie_pagina, 48, 52, false, 8, footerAlign, 516);

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
