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
    plantilla?: "PLANTILLA_1" | "PLANTILLA_2" | "PLANTILLA_3" | "PLANTILLA_4" | "PLANTILLA_5";
    leyenda_legal?: string;
    mensaje_final?: string;
    mostrar_observaciones?: boolean;
    mostrar_rfc_cliente?: boolean;
    mostrar_logo?: boolean;
    logo_url?: string;
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
    leyenda_legal: "Este documento es una nota de venta / comprobante administrativo. No es un CFDI. Para efectos fiscales, solicite su factura correspondiente.",
    mensaje_final: "Gracias por su compra. Conserve este comprobante para cualquier aclaración.",
    mostrar_observaciones: true,
    mostrar_rfc_cliente: true,
    mostrar_logo: true,
    logo_url: "",
  }
};

interface ImagePdfData {
  bytes: Uint8Array;
  width: number;
  height: number;
}

function parseJpegInfo(buffer: Uint8Array): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) return null;
  let offset = 2;
  while (offset < buffer.length - 8) {
    if (buffer[offset] !== 0xFF) return null;
    const marker = buffer[offset + 1];
    if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
      const height = (buffer[offset + 5] << 8) | buffer[offset + 6];
      const width = (buffer[offset + 7] << 8) | buffer[offset + 8];
      return { width, height };
    }
    const blockLength = (buffer[offset + 2] << 8) | buffer[offset + 3];
    offset += 2 + blockLength;
  }
  return null;
}

function convertDataUrlToJpegDataUrl(dataUrl: string): string | null {
  if (typeof window === "undefined" || !document) return null;
  try {
    const img = new Image();
    img.src = dataUrl;
    if (!img.complete || img.naturalWidth === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch (err) {
    return null;
  }
}

function processLogoDataUrl(dataUrl?: string): ImagePdfData | null {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return null;
  let targetUrl = dataUrl;
  if (!dataUrl.startsWith("data:image/jpeg") && !dataUrl.startsWith("data:image/jpg")) {
    const converted = convertDataUrlToJpegDataUrl(dataUrl);
    if (converted) targetUrl = converted;
  }
  try {
    const base64Index = targetUrl.indexOf(";base64,");
    if (base64Index === -1) return null;
    const base64Str = targetUrl.substring(base64Index + 8);
    const binaryStr = atob(base64Str);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const info = parseJpegInfo(bytes);
    if (info) {
      return { bytes, width: info.width, height: info.height };
    }
  } catch (err) {
    console.error("Error parsing logo image for PDF:", err);
  }
  return null;
}

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

class PdfBuilder {
  private chunks: Uint8Array[] = [];
  private totalLength = 0;
  private encoder = new TextEncoder();

  addString(str: string) {
    const bytes = this.encoder.encode(str);
    this.chunks.push(bytes);
    this.totalLength += bytes.length;
  }

  addBytes(bytes: Uint8Array) {
    this.chunks.push(bytes);
    this.totalLength += bytes.length;
  }

  get length(): number {
    return this.totalLength;
  }

  toBlob(): Blob {
    const result = new Uint8Array(this.totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return new Blob([result], { type: "application/pdf" });
  }
}

function createPdf(pages: string[], logoData?: ImagePdfData | null): Blob {
  const M = pages.length;
  const f1Obj = 2 * M + 3;
  const f2Obj = 2 * M + 4;
  const logoObj = 2 * M + 5;
  const encoder = new TextEncoder();

  const resources = logoData
    ? `<< /Font << /F1 ${f1Obj} 0 R /F2 ${f2Obj} 0 R >> /XObject << /Im1 ${logoObj} 0 R >> >>`
    : `<< /Font << /F1 ${f1Obj} 0 R /F2 ${f2Obj} 0 R >> >>`;

  interface ObjEntry {
    header: string;
    streamBytes?: Uint8Array;
    footer: string;
  }

  const objEntries: ObjEntry[] = [];

  // Catalog (obj 1)
  objEntries.push({
    header: "<< /Type /Catalog /Pages 2 0 R >>",
    footer: "",
  });

  // Pages container (obj 2)
  const kids: string[] = [];
  for (let i = 0; i < M; i++) {
    kids.push(`${3 + 2 * i} 0 R`);
  }
  objEntries.push({
    header: `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${M} >>`,
    footer: "",
  });

  // Pages definitions and content streams (obj 3, 4, 5, 6...)
  for (let i = 0; i < M; i++) {
    const contentObjId = 4 + 2 * i;
    const pageCmdBytes = encoder.encode(pages[i]);

    objEntries.push({
      header: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources ${resources} /Contents ${contentObjId} 0 R >>`,
      footer: "",
    });

    objEntries.push({
      header: `<< /Length ${pageCmdBytes.length} >>\nstream\n`,
      streamBytes: pageCmdBytes,
      footer: "\nendstream",
    });
  }

  // Fonts
  objEntries.push({
    header: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    footer: "",
  });
  objEntries.push({
    header: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    footer: "",
  });

  // Logo XObject
  if (logoData) {
    objEntries.push({
      header: `<< /Type /XObject /Subtype /Image /Width ${logoData.width} /Height ${logoData.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoData.bytes.length} >>\nstream\n`,
      streamBytes: logoData.bytes,
      footer: "\nendstream",
    });
  }

  const builder = new PdfBuilder();
  builder.addString("%PDF-1.4\n");

  const offsets: number[] = [0];

  objEntries.forEach((entry, idx) => {
    offsets.push(builder.length);
    const objNum = idx + 1;
    builder.addString(`${objNum} 0 obj\n${entry.header}`);
    if (entry.streamBytes) {
      builder.addBytes(entry.streamBytes);
    }
    builder.addString(`${entry.footer}\nendobj\n`);
  });

  const xrefOffset = builder.length;
  builder.addString(`xref\n0 ${objEntries.length + 1}\n0000000000 65535 f \n`);

  for (let i = 1; i <= objEntries.length; i++) {
    const offsetStr = String(offsets[i]).padStart(10, "0");
    builder.addString(`${offsetStr} 00000 n \n`);
  }

  builder.addString(`trailer\n<< /Size ${objEntries.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return builder.toBlob();
}

export function generateTicketPdfBlob(
  transaction: TicketTransaction,
  operationDetail: TicketOperationDetail | null,
  config: ComprobanteConfig = DEFAULT_CONFIG,
): Blob {
  const activeTemplate = config.tickets.plantilla || "PLANTILLA_1";
  const showLogoSetting = config.tickets.mostrar_logo ?? true;
  const showRfcClienteSetting = config.tickets.mostrar_rfc_cliente ?? true;
  const showObservacionesSetting = config.tickets.mostrar_observaciones ?? true;
  const logoData = showLogoSetting ? processLogoDataUrl(config.tickets.logo_url) : null;

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

  const pages: string[][] = [];
  let currentCmd: string[] = [];
  let y = 740;

  const setFillColor = (r: number, g: number, b: number) => {
    currentCmd.push(`${r} ${g} ${b} rg`);
  };
  const setStrokeColor = (r: number, g: number, b: number) => {
    currentCmd.push(`${r} ${g} ${b} RG`);
  };
  const drawRect = (x: number, y: number, w: number, h: number, fill = true, stroke = false) => {
    currentCmd.push(`${x} ${y} ${w} ${h} re`);
    if (fill && stroke) currentCmd.push("B");
    else if (fill) currentCmd.push("f");
    else if (stroke) currentCmd.push("S");
  };
  const drawLine = (x1: number, y1: number, x2: number, y2: number, width = 1) => {
    currentCmd.push(`${width} w`);
    currentCmd.push(`${x1} ${y1} m ${x2} ${y2} l S`);
  };
  const drawDottedLine = (x1: number, y1: number, x2: number, y2: number, r = 0.15, g = 0.23, b = 0.43, width = 1) => {
    currentCmd.push(`${r} ${g} ${b} RG`);
    currentCmd.push("[2 2] 0 d"); // pattern: 2 units drawn, 2 units off
    currentCmd.push(`${width} w`);
    currentCmd.push(`${x1} ${y1} m ${x2} ${y2} l S`);
    currentCmd.push("[] 0 d"); // turn off dashing
  };
  const drawText = (text: string, x: number, y: number, bold = false, size = 10) => {
    const font = bold ? "F2" : "F1";
    currentCmd.push(`BT /${font} ${size} Tf ${x} ${y} Td (${cleanPdfText(text)}) Tj ET`);
  };
  const drawTextAligned = (text: string, x: number, y: number, bold = false, size = 10, align: "IZQUIERDA" | "CENTRO" | "DERECHA" = "IZQUIERDA", containerWidth?: number) => {
    let finalX = x;
    const cleanStr = cleanPdfText(text);
    if (align === "CENTRO" || align === "DERECHA") {
      const textWidth = cleanStr.length * size * 0.52; // heuristic multiplier for Helvetica
      if (align === "CENTRO") {
        const center = containerWidth ? x + containerWidth / 2 : 306;
        finalX = center - textWidth / 2;
      } else {
        const right = containerWidth ? x + containerWidth : 564;
        finalX = right - textWidth;
      }
    }
    const font = bold ? "F2" : "F1";
    currentCmd.push(`BT /${font} ${size} Tf ${finalX} ${y} Td (${cleanStr}) Tj ET`);
  };

  const drawLogoImage = (x: number, yTop: number, maxW: number, maxH: number, align: "IZQUIERDA" | "CENTRO" | "DERECHA" = "IZQUIERDA") => {
    if (!logoData) return false;
    const aspect = logoData.width / logoData.height;
    let drawW = maxW;
    let drawH = drawW / aspect;
    if (drawH > maxH) {
      drawH = maxH;
      drawW = drawH * aspect;
    }
    let drawX = x;
    if (align === "CENTRO") {
      drawX = x + (maxW - drawW) / 2;
    } else if (align === "DERECHA") {
      drawX = x + maxW - drawW;
    }
    const drawY = yTop - drawH;
    currentCmd.push(`q ${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm /Im1 Do Q`);
    return true;
  };

  const drawLabeledText = (label: string, value: string, x: number, y: number, size = 8.5) => {
    const cleanLabel = cleanPdfText(label);
    const cleanVal = cleanPdfText(value);
    currentCmd.push(`BT /F2 ${size} Tf ${x} ${y} Td (${cleanLabel}) Tj /F1 ${size} Tf ( ${cleanVal}) Tj ET`);
  };

  const drawCenteredLabeledRow = (
    items: Array<{ label: string; value: string }>,
    centerX: number,
    y: number,
    size = 8.5
  ) => {
    const sep = "   |   ";
    let totalLen = 0;
    items.forEach((item, idx) => {
      totalLen += item.label.length + 1 + item.value.length;
      if (idx < items.length - 1) totalLen += sep.length;
    });
    const totalWidth = totalLen * size * 0.52;
    const startX = centerX - totalWidth / 2;

    let cmd = `BT /F2 ${size} Tf ${startX.toFixed(2)} ${y.toFixed(2)} Td`;
    items.forEach((item, idx) => {
      cmd += ` /F2 ${size} Tf (${cleanPdfText(item.label)}) Tj /F1 ${size} Tf ( ${cleanPdfText(item.value)}) Tj`;
      if (idx < items.length - 1) {
        cmd += ` /F1 ${size} Tf (${cleanPdfText(sep)}) Tj`;
      }
    });
    cmd += " ET";
    currentCmd.push(cmd);
  };

  const drawPageFooter = () => {
    setStrokeColor(0.8, 0.8, 0.8);
    drawLine(48, 70, 564, 70, 0.5);
    setFillColor(0.4, 0.4, 0.4);
    const footerAlign = activeTemplate === "PLANTILLA_2" || activeTemplate === "PLANTILLA_3" || activeTemplate === "PLANTILLA_5" ? "CENTRO" : "IZQUIERDA";
    drawTextAligned(config.tickets.pie_pagina, 48, 52, false, 8, footerAlign, 516);
  };

  const startNewPage = () => {
    drawPageFooter();
    pages.push(currentCmd);
    currentCmd = [];
    y = 740;
  };

  const renderClientSection = () => {
    // 3. DATOS DEL CLIENTE
    setFillColor(0.96, 0.97, 0.98);
    setStrokeColor(0.85, 0.88, 0.92);
    drawRect(48, y - 56, 516, 56, true, true);

    setFillColor(0.15, 0.23, 0.43);
    drawText("DATOS DEL CLIENTE", 58, y - 14, true, 8.5);

    setFillColor(0.15, 0.15, 0.15);
    const clientType = transaction.type || "Público General";
    const clientNum = transaction.idCliente ? String(transaction.idCliente) : "N/A";
    const clientName = transaction.client || "N/A";
    const clientRfc = showRfcClienteSetting ? (transaction.rfcCliente || "N/A") : "N/A";

    drawLabeledText("Tipo de operación:", clientType, 58, y - 28, 8.5);
    drawLabeledText("Número de cliente:", clientNum, 320, y - 28, 8.5);
    drawLabeledText("Nombre:", clientName, 58, y - 42, 8.5);
    drawLabeledText("RFC:", clientRfc, 320, y - 42, 8.5);

    y -= 68;
  };

  const drawHeader = (isFirstPage: boolean, includeTableHeader = true) => {
    if (isFirstPage) {
      if (activeTemplate === "PLANTILLA_2") {
        // ----------------------------------------------------
        // PLANTILLA 2: DISEÑO MODERNO (Emisor arriba a la izquierda, Comprobante a la derecha)
        // ----------------------------------------------------
        const headerText = config.fiscal.razon_social || "SI.CCO";

        // Top Left: Logo + Emisor Details
        let emisorY = y;
        if (showLogoSetting) {
          if (!drawLogoImage(48, emisorY, 110, 40, "IZQUIERDA")) {
            setFillColor(0.9, 0.93, 0.97);
            setStrokeColor(0.8, 0.85, 0.92);
            drawRect(48, emisorY - 36, 110, 36, true, true);
            setFillColor(0.2, 0.3, 0.5);
            drawTextAligned("Logo de tu empresa", 48, emisorY - 22, true, 8, "CENTRO", 110);
          }
          emisorY -= 44;
        }

        setFillColor(0.15, 0.23, 0.43);
        drawText(headerText, 48, emisorY, true, 11);
        emisorY -= 13;

        setFillColor(0.3, 0.3, 0.3);
        drawText(`RFC: ${config.fiscal.rfc}`, 48, emisorY, false, 8.5);
        emisorY -= 11;
        drawText(`Régimen Fiscal: ${config.fiscal.regimen_fiscal}`, 48, emisorY, false, 8.5);
        emisorY -= 11;
        drawText(`Dirección: ${config.fiscal.domicilio_fiscal}`, 48, emisorY, false, 8.5);
        emisorY -= 11;
        drawText(`CP: ${config.fiscal.codigo_postal} | Tel: ${config.fiscal.telefono}`, 48, emisorY, false, 8.5);
        emisorY -= 11;
        drawText(`Correo: ${config.fiscal.correo}`, 48, emisorY, false, 8.5);
        emisorY -= 15;

        // Top Right: Title and Folio/Date Card Box
        const cardW = 210;
        const cardX = 354;
        const cardY = y - 8;
        setFillColor(0.97, 0.98, 1);
        setStrokeColor(0.75, 0.82, 0.92);
        drawRect(cardX, cardY - 88, cardW, 88, true, true);

        // Header Title Banner inside Card
        setFillColor(0.15, 0.23, 0.43);
        drawRect(cardX, cardY - 24, cardW, 24, true, false);
        setFillColor(1, 1, 1);
        drawTextAligned(config.tickets.titulo_comprobante.toUpperCase(), cardX, cardY - 16, true, 9.5, "CENTRO", cardW);

        setFillColor(0.1, 0.1, 0.1);
        drawLabeledText("Folio:", transaction.serieFolio, cardX + 12, cardY - 40, 9.5);
        drawLabeledText("Fecha:", displayDate, cardX + 12, cardY - 54, 9);
        if (displayTime) {
          drawLabeledText("Hora:", displayTime, cardX + 12, cardY - 66, 9);
        }
        
        const isAnulada = transaction.status === "ANULADA";
        setFillColor(isAnulada ? 0.8 : 0.15, isAnulada ? 0.1 : 0.55, isAnulada ? 0.1 : 0.3);
        drawLabeledText("Estado:", transaction.status || "COMPLETADO", cardX + 12, cardY - 80, 9);

        y = Math.min(emisorY, cardY - 98);
        y -= 10;

        // Render Client Section
        renderClientSection();

      } else if (activeTemplate === "PLANTILLA_5") {
        // ----------------------------------------------------
        // PLANTILLA 5: DISEÑO TICKET (Estilo comprobante de caja / POS compacto) REDISEÑADO
        // ----------------------------------------------------
        const headerText5 = config.fiscal.razon_social || "SI.CCO";
        
        // 1. Logo Centrado Prominente
        if (showLogoSetting) {
          if (drawLogoImage(48, y, 516, 52, "CENTRO")) {
            y -= 58;
          } else {
            setFillColor(0.94, 0.96, 0.98);
            setStrokeColor(0.8, 0.85, 0.9);
            drawRect(226, y - 34, 160, 34, true, true);
            setFillColor(0.3, 0.3, 0.3);
            drawTextAligned("LOGO DE TU EMPRESA", 226, y - 21, true, 8.5, "CENTRO", 160);
            y -= 42;
          }
        }

        // 2. Razón Social y Datos Emisor centrados
        setFillColor(0.08, 0.12, 0.2);
        drawTextAligned(headerText5, 48, y, true, 13, "CENTRO", 516);
        y -= 15;

        setFillColor(0.25, 0.25, 0.25);
        drawTextAligned(`RFC: ${config.fiscal.rfc}   |   Régimen Fiscal: ${config.fiscal.regimen_fiscal}`, 48, y, false, 8.5, "CENTRO", 516);
        y -= 12;
        drawTextAligned(`Dirección: ${config.fiscal.domicilio_fiscal}   CP: ${config.fiscal.codigo_postal}`, 48, y, false, 8.5, "CENTRO", 516);
        y -= 12;
        drawTextAligned(`Teléfono: ${config.fiscal.telefono}   |   Correo: ${config.fiscal.correo}`, 48, y, false, 8.5, "CENTRO", 516);
        y -= 16;

        // Divisor punteado estilo ticket
        drawDottedLine(48, y, 564, y, 0.3, 0.3, 0.3, 1);
        y -= 16;

        // 3. Bloque de Título y Folio
        setFillColor(0.95, 0.96, 0.98);
        setStrokeColor(0.8, 0.85, 0.9);
        drawRect(48, y - 56, 516, 56, true, true);

        setFillColor(0.12, 0.18, 0.32);
        drawTextAligned(config.tickets.titulo_comprobante.toUpperCase(), 48, y - 16, true, 11, "CENTRO", 516);

        setFillColor(0.1, 0.1, 0.1);
        drawCenteredLabeledRow(
          [
            { label: "Folio:", value: transaction.serieFolio },
            { label: "Fecha:", value: displayDate },
            ...(displayTime ? [{ label: "Hora:", value: displayTime }] : [])
          ],
          306,
          y - 32,
          9
        );
        
        const isAnulada5 = transaction.status === "ANULADA";
        setFillColor(isAnulada5 ? 0.8 : 0.05, isAnulada5 ? 0.1 : 0.5, isAnulada5 ? 0.1 : 0.25);
        drawCenteredLabeledRow(
          [{ label: "Estado:", value: transaction.status || "COMPLETADO" }],
          306,
          y - 46,
          8.5
        );
        y -= 68;

        drawDottedLine(48, y, 564, y, 0.3, 0.3, 0.3, 1);
        y -= 16;

        // Render Client Section
        renderClientSection();

      } else if (activeTemplate === "PLANTILLA_3") {
        // ----------------------------------------------------
        // PLANTILLA 3: DISEÑO EJECUTIVO REDISEÑADO
        // ----------------------------------------------------
        const headerText3 = config.fiscal.razon_social || "SI.CCO";
        let emisorY = y;

        // Izquierda: Logo y Datos Emisor
        if (showLogoSetting) {
          if (drawLogoImage(48, emisorY, 140, 48, "IZQUIERDA")) {
            emisorY -= 54;
          } else {
            setFillColor(0.93, 0.95, 0.98);
            setStrokeColor(0.8, 0.85, 0.92);
            drawRect(48, emisorY - 40, 130, 40, true, true);
            setFillColor(0.2, 0.3, 0.5);
            drawTextAligned("LOGO EJECUTIVO", 48, emisorY - 24, true, 8.5, "CENTRO", 130);
            emisorY -= 48;
          }
        }

        setFillColor(0.09, 0.14, 0.28);
        drawText(headerText3, 48, emisorY, true, 11);
        emisorY -= 13;

        setFillColor(0.3, 0.35, 0.42);
        drawText(`RFC: ${config.fiscal.rfc}`, 48, emisorY, false, 8.5);
        emisorY -= 11;
        drawText(`Régimen Fiscal: ${config.fiscal.regimen_fiscal}`, 48, emisorY, false, 8.5);
        emisorY -= 11;
        drawText(`Dirección: ${config.fiscal.domicilio_fiscal}`, 48, emisorY, false, 8.5);
        emisorY -= 11;
        drawText(`CP: ${config.fiscal.codigo_postal}  |  Tel: ${config.fiscal.telefono}`, 48, emisorY, false, 8.5);
        emisorY -= 11;
        drawText(`Correo: ${config.fiscal.correo}`, 48, emisorY, false, 8.5);
        emisorY -= 15;

        // Derecha: Tarjeta Ejecutiva
        const cardW = 210;
        const cardX = 354;
        const cardY = y;

        setFillColor(0.96, 0.97, 1);
        setStrokeColor(0.2, 0.35, 0.65);
        drawRect(cardX, cardY - 92, cardW, 92, true, true);

        // Header Title Banner inside Card
        setFillColor(0.09, 0.14, 0.28);
        drawRect(cardX, cardY - 26, cardW, 26, true, false);

        setFillColor(1, 1, 1);
        drawTextAligned(config.tickets.titulo_comprobante.toUpperCase(), cardX, cardY - 17, true, 9.5, "CENTRO", cardW);

        setFillColor(0.1, 0.1, 0.1);
        drawLabeledText("Folio:", transaction.serieFolio, cardX + 12, cardY - 42, 10);
        drawLabeledText("Fecha:", displayDate, cardX + 12, cardY - 56, 8.5);
        if (displayTime) {
          drawLabeledText("Hora:", displayTime, cardX + 12, cardY - 68, 8.5);
        }

        const isAnulada3 = transaction.status === "ANULADA";
        setFillColor(isAnulada3 ? 0.8 : 0.05, isAnulada3 ? 0.1 : 0.5, isAnulada3 ? 0.1 : 0.25);
        drawLabeledText("Estado:", transaction.status || "COMPLETADO", cardX + 12, cardY - 82, 8.5);

        y = Math.min(emisorY, cardY - 104);
        y -= 8;

        // Doble línea elegante ejecutiva
        setStrokeColor(0.09, 0.14, 0.28);
        drawLine(48, y, 564, y, 1.5);
        setStrokeColor(0.25, 0.5, 0.85);
        drawLine(48, y - 3, 564, y - 3, 0.75);
        y -= 16;

        renderClientSection();

      } else if (activeTemplate === "PLANTILLA_4") {
        // ----------------------------------------------------
        // PLANTILLA 4: COMPROBANTE FORMAL
        // ----------------------------------------------------
        const headerText4 = config.fiscal.razon_social || "SI.CCO";
        setFillColor(0.15, 0.23, 0.43);
        drawRect(48, y - 10, 516, 40, true, false);

        setFillColor(1, 1, 1);
        drawTextAligned(headerText4, 48, y + 2, true, 13, "CENTRO", 516);
        y -= 45;

        if (showLogoSetting) {
          if (!drawLogoImage(48, y, 120, 50, "IZQUIERDA")) {
            setFillColor(0.89, 0.92, 0.96);
            setStrokeColor(0.77, 0.83, 0.9);
            drawRect(48, y - 50, 120, 50, true, true);
            setFillColor(0.28, 0.36, 0.47);
            drawTextAligned("Logo de tu empresa", 48, y - 29, true, 8.5, "CENTRO", 120);
          }
        }

        setFillColor(0.08, 0.11, 0.17);
        drawText("Folio:", 470, y - 10, true, 9.5);
        drawText(transaction.serieFolio || "-", 505, y - 10, false, 9.5);
        drawText("Fecha:", 470, y - 25, true, 9.5);
        drawText(displayDate || "-", 505, y - 25, false, 9.5);
        drawText("Hora:", 470, y - 40, true, 9.5);
        drawText(displayTime || "-", 505, y - 40, false, 9.5);
        y -= 65;

        setFillColor(0.15, 0.23, 0.43);
        drawText(config.tickets.titulo_comprobante.toUpperCase(), 48, y, true, 11);
        y -= 10;

        setStrokeColor(0.8, 0.8, 0.8);
        drawLine(48, y, 564, y, 1);
        y -= 20;

        renderClientSection();

      } else {
        // ----------------------------------------------------
        // PLANTILLA 1: DISEÑO CLÁSICO
        // ----------------------------------------------------
        const headerText = config.fiscal.razon_social || "SI.CCO";
        setFillColor(0.15, 0.23, 0.43);
        drawRect(48, y - 10, 516, 40, true, false);
        
        setFillColor(1, 1, 1);
        drawText(headerText, 60, y + 2, true, 13);
        if (showLogoSetting) {
          drawLogoImage(450, y + 26, 100, 32, "DERECHA");
        }
        y -= 45;

        setFillColor(0.2, 0.2, 0.2);
        drawTextAligned(config.tickets.titulo_comprobante.toUpperCase(), 48, y, true, 11, config.tickets.alineacion_titulo || "IZQUIERDA");
        y -= 12;

        setStrokeColor(0.8, 0.8, 0.8);
        drawLine(48, y, 564, y, 1);
        y -= 20;

        // Metadata & Emisor
        setFillColor(0.1, 0.1, 0.1);
        drawText(`Folio: ${transaction.serieFolio}`, 48, y - 10, true, 9.5);
        drawText(`Fecha: ${displayDate}`, 48, y - 22, false, 9);
        let metadataOffset = 22;
        if (displayTime) {
          drawText(`Hora: ${displayTime}`, 48, y - 34, false, 9);
          metadataOffset = 34;
        }

        const showFiscal = config.tickets.mostrar_datos_fiscales;
        let rightColumnHeight = 0;
        if (showFiscal) {
          const align = config.tickets.alineacion_emisor || "IZQUIERDA";
          setFillColor(0.3, 0.3, 0.3);
          drawTextAligned("DATOS EMISOR", 320, y, true, 8.5, align, 244);

          setFillColor(0.1, 0.1, 0.1);
          drawTextAligned(config.fiscal.razon_social, 320, y - 14, true, 9, align, 244);
          drawTextAligned(`RFC: ${config.fiscal.rfc}`, 320, y - 26, false, 9, align, 244);
          drawTextAligned(`Régimen Fiscal: ${config.fiscal.regimen_fiscal}`, 320, y - 38, false, 9, align, 244);
          
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
          
          drawTextAligned(`Dirección: ${addLine1}`, 320, y - 50, false, 9, align, 244);
          if (addLine2) {
            drawTextAligned(addLine2, 368, y - 62, false, 9, align, 244);
            drawTextAligned(`CP: ${config.fiscal.codigo_postal}  Tel: ${config.fiscal.telefono}`, 320, y - 74, false, 9, align, 244);
            drawTextAligned(`Correo: ${config.fiscal.correo}`, 320, y - 86, false, 9, align, 244);
            rightColumnHeight = 93;
          } else {
            drawTextAligned(`CP: ${config.fiscal.codigo_postal}  Tel: ${config.fiscal.telefono}`, 320, y - 62, false, 9, align, 244);
            drawTextAligned(`Correo: ${config.fiscal.correo}`, 320, y - 74, false, 9, align, 244);
            rightColumnHeight = 81;
          }
        }

        const leftColumnHeight = metadataOffset + 20;
        const maxColumnHeight = Math.max(leftColumnHeight, rightColumnHeight);
        y -= (maxColumnHeight + 15);

        renderClientSection();
      }
    } else {
      // Secondary pages header
      const headerText = config.fiscal.razon_social || "SI.CCO";
      setFillColor(0.15, 0.23, 0.43);
      drawRect(48, y - 10, 516, 25, true, false);
      setFillColor(1, 1, 1);
      drawTextAligned(`${headerText}  -  Folio: ${transaction.serieFolio} (Pág. ${pages.length + 1})`, 48, y - 4, true, 9.5, "CENTRO", 516);
      y -= 30;
    }

    if (includeTableHeader) {
      // Concepts Table Header
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
    }
  };

  // Draw first page header
  drawHeader(true, true);

  // Render Concepts Rows
  const details = operationDetail?.detalles || [];
  
  const drawRow = (desc: string, qty: number, price: number) => {
    if (y < 130) {
      drawTextAligned("(Continúa en la siguiente página...)", 306, y, false, 8, "CENTRO");
      startNewPage();
      drawHeader(false, true);
    }

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
    details.forEach((detail) => {
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

  // Check if summary area fits on current page
  if (y < 280) {
    drawTextAligned("(Resumen en la siguiente página...)", 306, y, false, 8, "CENTRO");
    startNewPage();
    drawHeader(false, false);
  }

  // Summary / Total Area
  setStrokeColor(0.7, 0.7, 0.7);
  drawLine(48, y, 564, y, 1.5);
  y -= 18;

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

  // Payment details
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

  setFillColor(0.15, 0.23, 0.43);
  drawText("MÉTODOS DE PAGO", 48, y, true, 8.5);
  y -= 16;
  
  setFillColor(0.1, 0.1, 0.1);
  const paymentKeys = Object.keys(groupedPayments);
  if (paymentKeys.length) {
    paymentKeys.forEach((method) => {
      drawLabeledText(`${method}:`, money(groupedPayments[method]), 48, y, 9);
      y -= 14;
    });
  } else {
    drawText("Sin especificar", 48, y, false, 9);
    y -= 14;
  }

  y -= 10;

  // Remarks / Observations Box (If enabled)
  if (showObservacionesSetting) {
    const manualObs = getManualObservation(transaction.observation) || "Sin observaciones.";
    const wrappedLines = wrapText(manualObs, 95);
    const boxHeight = 22 + wrappedLines.length * 13;
    
    if (y - boxHeight < 130) {
      startNewPage();
      drawHeader(false, false);
    }

    setStrokeColor(0.85, 0.85, 0.85);
    drawRect(48, y - boxHeight, 516, boxHeight, false, true);
    
    setFillColor(0.3, 0.3, 0.3);
    drawText("OBSERVACIONES", 56, y - 14, true, 8);
    
    setFillColor(0.15, 0.15, 0.15);
    wrappedLines.forEach((line, idx) => {
      drawText(line, 56, y - 27 - idx * 13, false, 8.5);
    });
    
    y -= (boxHeight + 12);
  }

  // Leyenda Legal & Mensaje Final (Always checked before bottom)
  const leyendaText = config.tickets.leyenda_legal || "Este documento es una nota de venta / comprobante administrativo. No es un CFDI. Para efectos fiscales, solicite su factura correspondiente.";
  const mensajeFinalText = config.tickets.mensaje_final || "Gracias por su compra. Conserve este comprobante para cualquier aclaración.";

  const leyendaWrapped = wrapText(leyendaText, 100);
  const mensajeWrapped = wrapText(mensajeFinalText, 100);
  const legalSectionHeight = (leyendaWrapped.length + mensajeWrapped.length) * 12 + 25;

  if (y - legalSectionHeight < 80) {
    startNewPage();
    drawHeader(false, false);
  }

  y -= 8;
  drawDottedLine(48, y, 564, y, 0.7, 0.7, 0.7, 0.5);
  y -= 14;

  // Render Leyenda Legal
  setFillColor(0.35, 0.35, 0.35);
  leyendaWrapped.forEach((line) => {
    drawTextAligned(line, 48, y, false, 8, "CENTRO", 516);
    y -= 11;
  });

  y -= 4;
  // Render Mensaje Final
  setFillColor(0.15, 0.23, 0.43);
  mensajeWrapped.forEach((line) => {
    drawTextAligned(line, 48, y, true, 8.5, "CENTRO", 516);
    y -= 12;
  });

  // Push final page commands
  startNewPage();

  // Generate PDF
  const pagesStreams = pages.map((p) => p.join("\n"));
  return createPdf(pagesStreams, logoData);
}

export function downloadTicketPdf(
  transaction: TicketTransaction,
  operationDetail: TicketOperationDetail | null,
  config: ComprobanteConfig = DEFAULT_CONFIG,
) {
  const blob = generateTicketPdfBlob(transaction, operationDetail, config);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ticket-${transaction.serieFolio || "operacion"}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
