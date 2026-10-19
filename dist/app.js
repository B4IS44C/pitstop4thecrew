// outputs/pitstop-owner/dist/payment-editor.js
function initPaymentEditor({ call, onSaved }) {
  const dialog = document.createElement("dialog");
  dialog.className = "multi-dialog";
  dialog.innerHTML = '<form><div class="multi-heading"><h2>Editar monto abonado</h2><button type="button" data-close aria-label="Cerrar">\xD7</button></div><p data-info></p><label>Monto abonado (opcional)<input data-amount inputmode="decimal" maxlength="15" placeholder="En blanco: adelanto del 20%"></label><p>Escribe el total pagado por el cliente, no solo la diferencia. Deja vac\xEDo para usar el adelanto habitual del 20%. El comprobante recuperado mostrar\xE1 el nuevo saldo.</p><p data-preview class="multi-totals" aria-live="polite"></p><button type="submit" class="button">Guardar abono</button><p data-error role="alert"></p></form>';
  document.body.append(dialog);
  const $3 = (s) => dialog.querySelector(s);
  let sale, busy = false, requestId, payloadKey;
  const money2 = (n) => new Intl.NumberFormat("es-CR", { style: "currency", currency: sale.paymentDocument?.currency || "CRC" }).format(n / 100);
  function preview() {
    const d = sale.paymentDocument, currency = d?.currency || "CRC", total = d?.totalMinor ?? (currency === "USD" ? sale.totalCents : sale.totalCrcMinor), fallback = d?.defaultPaidMinor ?? d?.paidMinor ?? (currency === "USD" ? Math.round(total / 5) : Math.min(total, Math.ceil(total / 5e5) * 1e5)), raw = $3("[data-amount]").value.trim().replace(",", "."), paid = raw ? Math.round(Number(raw) * 100) : fallback, valid = (!raw || /^\d{1,12}(?:\.\d{1,2})?$/.test(raw)) && Number.isSafeInteger(paid) && paid >= 0 && paid <= total;
    $3("[data-amount]").setCustomValidity(valid ? "" : "El abono debe estar entre cero y el total.");
    $3("[data-preview]").textContent = valid ? `Total: ${money2(total)} \xB7 Abonado: ${money2(paid)} \xB7 Pendiente: ${money2(total - paid)}` : "Revisa el monto abonado.";
  }
  $3("[data-amount]").oninput = preview;
  $3("[data-close]").onclick = () => {
    if (!busy) dialog.close();
  };
  dialog.addEventListener("cancel", (e) => {
    if (busy) e.preventDefault();
  });
  $3("form").onsubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    busy = true;
    $3("button[type=submit]").disabled = true;
    $3("[data-amount]").disabled = true;
    try {
      const paidAmount = $3("[data-amount]").value.trim();
      if (payloadKey !== paidAmount) {
        payloadKey = paidAmount;
        requestId = crypto.randomUUID();
      }
      await call("ownerChangeSale", { saleId: sale.id, version: sale.version ?? 0, action: "payment", actionId: requestId, paidAmount });
      dialog.close();
      await onSaved();
    } catch (e2) {
      $3("[data-error]").textContent = e2.message || "No se pudo guardar el abono.";
    } finally {
      busy = false;
      $3("button[type=submit]").disabled = false;
      $3("[data-amount]").disabled = false;
    }
  };
  const open = (item) => {
    sale = item;
    requestId = null;
    payloadKey = null;
    $3("[data-error]").textContent = "";
    $3("[data-info]").textContent = item.product + " \xB7 Moneda: " + (item.paymentDocument?.currency || "CRC");
    $3("[data-amount]").value = item.paymentDocument?.customPayment ? (item.paymentDocument.paidMinor / 100).toFixed(2) : "";
    preview();
    dialog.showModal();
  };
  open.close = () => {
    dialog.close();
    $3("form").reset();
    $3("[data-info]").textContent = "";
    $3("[data-preview]").textContent = "";
  };
  return open;
}

// outputs/pitstop-owner/dist/multiple-pdf.js?v=20261015
async function multiplePaymentPdf(q) {
  const logo = new Image();
  logo.src = new URL("./assets/logo.jpeg", import.meta.url).href;
  await logo.decode();
  const pages = [], W = 1200, H = 1697, crc = (n) => q.currency === "USD" ? "US$ " + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n / 100) : "\u20A1" + new Intl.NumberFormat("es-CR").format(n / 100);
  let canvas, c, y;
  const text = (s, x, yy, size = 24, bold = false, right = false) => {
    c.font = `${bold ? 700 : 400} ${size}px Arial`;
    c.fillStyle = "#202126";
    c.textAlign = right ? "right" : "left";
    c.fillText(s, x, yy);
  };
  function page() {
    canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    c = canvas.getContext("2d");
    c.fillStyle = "#fff";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#101114";
    c.fillRect(0, 0, W, 200);
    c.drawImage(logo, 45, 5, 190, 190);
    c.font = "bold 35px Arial";
    c.fillStyle = "#fff";
    c.textAlign = "right";
    c.fillText("COMPROBANTE DE PAGO", 1130, 85);
    c.font = "24px Arial";
    c.fillText(q.number, 1130, 130);
    c.fillStyle = "#dd1222";
    c.fillRect(0, 200, W, 8);
    text(q.customerName || "Cliente", 70, 260, 27, true);
    text("Tel\xE9fono: " + q.customerPhone, 70, 300);
    text("Fecha: " + new Intl.DateTimeFormat("es-CR").format(new Date(q.issuedAt)), 1130, 300, 23, false, true);
    y = 355;
  }
  async function finish() {
    text("Seguimiento: " + q.trackingCode, 70, H - 105, 24, true);
    text("PITSTOP REPUESTOS \xB7 Gracias por tu confianza", 70, H - 55, 21);
    text("P\xE1gina " + (pages.length + 1), 1130, H - 55, 21, false, true);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.94));
    pages.push(new Uint8Array(await blob.arrayBuffer()));
  }
  function wrap(s, width) {
    c.font = "24px Arial";
    let line = "", lines = [];
    for (const word of String(s).split(/\s+/)) {
      for (const ch of (line ? " " : "") + word) {
        if (c.measureText(line + ch).width > width) {
          lines.push(line);
          line = "";
        }
        line += ch;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
  function headings() {
    c.fillStyle = "#f8e8eb";
    c.fillRect(70, y - 28, 1060, 48);
    text("REPUESTO", 85, y, 21, true);
    text("TOTAL", 760, y, 21, true, true);
    text(q.customPayment ? "ABONADO" : "ADELANTO 20%", 950, y, 21, true, true);
    text("SALDO", 1120, y, 21, true, true);
    y += 55;
  }
  page();
  headings();
  for (const item of q.items) {
    const lines = wrap(item.product, 465), height = Math.max(80, lines.length * 30 + 28);
    if (y + height > 1330) {
      await finish();
      page();
      headings();
    }
    lines.forEach((s, i) => text(s, 85, y + i * 30));
    text(crc(item.totalMinor), 760, y, 23, true, true);
    text(crc(item.paidMinor), 950, y, 23, true, true);
    text(crc(item.balanceMinor), 1120, y, 23, true, true);
    y += height;
    c.fillStyle = "#e2e4e8";
    c.fillRect(70, y - 38, 1060, 1);
  }
  if (y + 390 > 1450) {
    await finish();
    page();
  }
  for (const [label, value] of [["Env\xEDo GRATIS (0%)", 0], ["Total de la compra", q.totalMinor], [q.customPayment ? "Monto abonado" : "Adelanto recibido \xB7 20%", q.paidMinor], ["Saldo pendiente", q.balanceMinor]]) {
    text(label, 85, y, 28, true);
    text(crc(value), 1120, y, 30, true, true);
    y += 65;
  }
  text("El saldo se cancela al momento de la entrega personal.", 85, y + 15, 24);
  text("Llegada estimada: " + q.arrival, 85, y + 58, 24);
  await finish();
  return pdf(pages, W, H);
}
function pdf(pages, width, height) {
  const enc = new TextEncoder(), parts = [], offsets = [0];
  let size = 0;
  const add = (x2) => {
    const b = typeof x2 === "string" ? enc.encode(x2) : x2;
    parts.push(b);
    size += b.length;
  }, obj = (n, s) => {
    offsets[n] = size;
    add(`${n} 0 obj
${s}
endobj
`);
  };
  add("%PDF-1.4\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  pages.forEach((bytes, i) => {
    const p = 3 + i * 3;
    obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${p + 1} 0 R >> >> /Contents ${p + 2} 0 R >>`);
    offsets[p + 1] = size;
    add(`${p + 1} 0 obj
<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>
stream
`);
    add(bytes);
    add("\nendstream\nendobj\n");
    const content = "q 595.28 0 0 841.89 0 0 cm /Im0 Do Q\n";
    obj(p + 2, `<< /Length ${content.length} >>
stream
${content}endstream`);
  });
  const x = size;
  add(`xref
0 ${offsets.length}
0000000000 65535 f 
`);
  for (let i = 1; i < offsets.length; i++) add(String(offsets[i]).padStart(10, "0") + " 00000 n \n");
  add(`trailer
<< /Size ${offsets.length} /Root 1 0 R >>
startxref
${x}
%%EOF`);
  return new Blob(parts, { type: "application/pdf" });
}

// outputs/pitstop-owner/dist/payment-pdf.js?v=20261015
function jpegPdf(jpeg, width, height) {
  const enc = new TextEncoder(), parts = [], offsets = [0];
  let length = 0;
  const add = (value) => {
    const bytes = typeof value === "string" ? enc.encode(value) : value;
    parts.push(bytes);
    length += bytes.length;
  };
  const obj = (n, value) => {
    offsets[n] = length;
    add(`${n} 0 obj
${value}
endobj
`);
  };
  add("%PDF-1.4\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>");
  offsets[4] = length;
  add(`4 0 obj
<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>
stream
`);
  add(jpeg);
  add("\nendstream\nendobj\n");
  const scale = Math.min(595.28 / width, 841.89 / height), w = width * scale, h = height * scale;
  const content = `q ${w.toFixed(3)} 0 0 ${h.toFixed(3)} ${((595.28 - w) / 2).toFixed(3)} ${(841.89 - h).toFixed(3)} cm /Im0 Do Q
`;
  obj(5, `<< /Length ${enc.encode(content).length} >>
stream
${content}endstream`);
  const start2 = length;
  add("xref\n0 6\n0000000000 65535 f \n");
  for (let i = 1; i <= 5; i++) add(String(offsets[i]).padStart(10, "0") + " 00000 n \n");
  add(`trailer
<< /Size 6 /Root 1 0 R >>
startxref
${start2}
%%EOF
`);
  return new Blob(parts, { type: "application/pdf" });
}
async function paymentPdf(q) {
  const crc = (value) => q.currency === "USD" ? "US$ " + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100) : "\u20A1" + new Intl.NumberFormat("es-CR", { maximumFractionDigits: 2 }).format(value / 100);
  if (q.items?.length) return multiplePaymentPdf(q);
  const logo = new Image();
  logo.src = new URL("./assets/logo.jpeg", import.meta.url).href;
  await logo.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  const c = canvas.getContext("2d");
  const font = (size, bold = false) => {
    c.font = `${bold ? "700" : "400"} ${size}px Arial, sans-serif`;
  };
  function wrap(value, width, size = 28) {
    font(size);
    const lines = [];
    let line = "";
    for (const word of String(value).replace(/\s+/g, " ").trim().split(" ")) {
      const next = line ? line + " " + word : word;
      if (c.measureText(next).width <= width) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      for (const char of word) {
        if (c.measureText(line + char).width > width) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
  const product = wrap(q.product, 700), name = wrap(q.customerName || "Cliente", 1060, 30), productHeight = Math.max(110, product.length * 38 + 46), nameHeight = name.length * 38;
  canvas.height = Math.max(1697, 1350 + productHeight + nameHeight);
  const box = (x, y2, w, h, color) => {
    c.fillStyle = color;
    c.fillRect(x, y2, w, h);
  };
  const text = (value, x, y2, size = 28, color = "#202126", bold = false, right = false) => {
    font(size, bold);
    c.fillStyle = color;
    c.textAlign = right ? "right" : "left";
    c.fillText(value, x, y2);
  };
  box(0, 0, 1200, canvas.height, "#fff");
  box(0, 0, 1200, 290, "#090a0c");
  box(0, 290, 1200, 12, "#e20a18");
  c.drawImage(logo, 46, 8, 280, 280);
  text("COMPROBANTE DE PAGO", 1130, 100, 43, "#fff", true, true);
  text(q.number, 1130, 158, 28, "#fff", true, true);
  const date2 = new Intl.DateTimeFormat("es-CR", { timeZone: "America/Costa_Rica", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(q.issuedAt));
  text("Fecha: " + date2, 1130, 210, 25, "#c4c6cc", false, true);
  text("RECIBIDO DE", 70, 365, 22, "#dd1222", true);
  name.forEach((line, i) => text(line, 70, 411 + i * 38, 30, "#202126", true));
  let y = 420 + nameHeight;
  const phone = String(q.customerPhone).replace(/^\+?/, "+");
  text("Tel\xE9fono: " + phone, 70, y, 26, "#5f626b");
  y += 60;
  box(70, y, 1060, 62, "#dd1222");
  text("DESCRIPCI\xD3N", 92, y + 41, 23, "#fff", true);
  text("IMPORTE", 1108, y + 41, 23, "#fff", true, true);
  y += 62;
  product.forEach((line, i) => text(line, 92, y + 45 + i * 38));
  text(crc(q.totalMinor), 1108, y + 45, 30, "#202126", true, true);
  y += productHeight;
  box(70, y, 1060, 2, "#e8e9ec");
  text("Costo del env\xEDo \xB7 GRATIS (0%)", 92, y + 50, 27);
  text(crc(q.shippingMinor), 1108, y + 50, 30, "#202126", true, true);
  y += 92;
  box(70, y, 1060, 2, "#e8e9ec");
  text("Total de la compra", 92, y + 50, 28);
  text(crc(q.totalMinor), 1108, y + 50, 32, "#202126", true, true);
  y += 92;
  box(70, y, 1060, 125, "#101114");
  text(q.customPayment ? "MONTO ABONADO" : "MONTO PAGADO \xB7 ADELANTO 20%", 94, y + 43, 24, "#fff", true);
  text(crc(q.paidMinor), 1106, y + 94, 48, "#fff", true, true);
  y += 150;
  box(70, y, 1060, 90, "#fff0f1");
  text("SALDO PENDIENTE", 94, y + 56, 27, "#dd1222", true);
  text(crc(q.balanceMinor), 1106, y + 56, 38, "#dd1222", true, true);
  y += 146;
  text("El saldo pendiente se cancela al momento de la entrega personal.", 70, y, 26);
  y += 80;
  text("\xA1Gracias por tu compra y por confiar en PitStop!", 70, y, 30, "#202126", true);
  text("Tu adelanto nos permite encargar el repuesto para vos.", 70, y + 44, 26, "#5f626b");
  if (q.trackingCode) text("Seguimiento: " + q.trackingCode, 70, canvas.height - 140, 23, "#202126", true);
  box(70, canvas.height - 100, 1060, 2, "#e8e9ec");
  text("PITSTOP REPUESTOS", 70, canvas.height - 48, 23, "#202126", true);
  text("CALIDAD QUE TE MUEVE", 1130, canvas.height - 48, 21, "#dd1222", true, true);
  const jpeg = await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo crear el PDF.")), "image/jpeg", 0.95));
  return jpegPdf(new Uint8Array(await jpeg.arrayBuffer()), canvas.width, canvas.height);
}

// outputs/pitstop-owner/dist/receipt-file.js
async function receiptFile(file) {
  if (!file) return null;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024 || file.size === 0) throw new Error("Selecciona una imagen JPG, PNG o WEBP de hasta 4 MB.");
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
  return { contentType: file.type, base64: data.slice(data.indexOf(",") + 1) };
}

// outputs/pitstop-owner/dist/multiple-sale-ui.js?v=20261015
function initMultipleSale({ call, context = () => ({}), check = () => true, owner = false, onSaved = () => {
} }) {
  const dialog = document.createElement("dialog");
  dialog.className = "multi-dialog";
  dialog.setAttribute("aria-label", owner ? "Editar venta m\xFAltiple" : "Generar venta m\xFAltiple");
  dialog.innerHTML = `<div class="multi-heading"><h2>${owner ? "Editar" : "Generar"} venta m\xFAltiple</h2><button type="button" data-close aria-label="Cerrar">\xD7</button></div><p>Selecciona las cotizaciones del mismo cliente. El adelanto y el saldo se suman por producto.</p><form data-search><label>Tel\xE9fono del cliente<input data-phone type="tel" required placeholder="+506 8888 8888"></label><button class="button" type="submit">Buscar cotizaciones</button></form><label>Filtrar por nombre del repuesto<input data-filter type="search" placeholder="Nombre del repuesto"></label><div data-list class="multi-list"></div><button type="button" data-more hidden>Ver m\xE1s cotizaciones</button><div data-totals class="multi-totals" aria-live="polite"></div><form data-save><fieldset data-fields><label class="payment-currency-choice"><input data-usd type="checkbox"> Pagado en d\xF3lares <small>El comprobante completo se emitir\xE1 en USD.</small></label><label class="paid-field">Monto abonado (opcional)<input data-paid inputmode="decimal" maxlength="15" placeholder="En blanco: adelanto del 20%"><small data-paid-hint>Es el total pagado, no solo la diferencia.</small></label>${owner ? "" : '<label>Nombre del cliente (opcional)<input data-name maxlength="120"></label><label>Direcci\xF3n de entrega<textarea data-address required maxlength="1000" rows="2"></textarea></label><label>Comprobante de pago (opcional)<input data-receipt type="file" accept="image/jpeg,image/png,image/webp"></label>'}<p>${owner ? "Los importes, el PDF y el seguimiento se actualizar\xE1n. Se conserva el c\xF3digo." : "Estas cotizaciones se convertir\xE1n en una sola venta por aprobar."}</p><button type="submit" class="button" data-submit>${owner ? "Guardar cambios" : "Crear venta m\xFAltiple y PDF"}</button></fieldset></form><p data-status role="status"></p><div data-success hidden><label>C\xF3digo de seguimiento<input data-code readonly></label><button type="button" data-copy>Copiar c\xF3digo</button><button type="button" data-pdf>Descargar PDF nuevamente</button></div>`;
  document.body.append(dialog);
  const $3 = (s) => dialog.querySelector(s), money2 = (n) => $3("[data-usd]").checked ? "US$ " + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n / 100) : "\u20A1" + new Intl.NumberFormat("es-CR").format(n / 100);
  let selected = /* @__PURE__ */ new Map(), rows2 = /* @__PURE__ */ new Map(), cursor2 = null, phone = "", sale = null, busy = false, requestId, documentData;
  function render() {
    const list = $3("[data-list]");
    list.replaceChildren();
    const term = $3("[data-filter]").value.toLocaleLowerCase("es");
    for (const row of rows2.values()) {
      if (term && !row.product.toLocaleLowerCase("es").includes(term)) continue;
      const label = document.createElement("label"), input = document.createElement("input"), span = document.createElement("span");
      label.className = "multi-option";
      input.type = "checkbox";
      input.checked = selected.has(row.id);
      input.disabled = busy;
      span.textContent = `${row.product} \xB7 ${new Intl.DateTimeFormat("es-CR").format(new Date(row.createdAt))} \xB7 ${money2($3("[data-usd]").checked ? row.totalCents : row.totalMinor)} \xB7 ${row.arrival}`;
      input.addEventListener("change", () => {
        if (input.checked) selected.set(row.id, row);
        else selected.delete(row.id);
        requestId = null;
        render();
      });
      label.append(input, span);
      list.append(label);
    }
    const values = [...selected.values()], total = values.reduce((n, r) => n + ($3("[data-usd]").checked ? r.totalCents : r.totalMinor), 0), defaultPaid = values.reduce((n, r) => n + ($3("[data-usd]").checked ? r.paidUsdMinor : r.paidMinor), 0);
    const raw = $3("[data-paid]").value.trim().replace(",", "."), paid = raw ? Math.round(Number(raw) * 100) : defaultPaid, valid = (!raw || /^\d{1,12}(?:\.\d{1,2})?$/.test(raw)) && Number.isSafeInteger(paid) && paid >= 0 && paid <= total;
    $3("[data-paid]").setCustomValidity(valid ? "" : "El abono debe estar entre cero y el total.");
    $3("[data-paid-hint]").textContent = "Monto total pagado en " + ($3("[data-usd]").checked ? "USD" : "CRC") + ". En blanco: 20% habitual. Sin separadores de miles.";
    $3("[data-totals]").textContent = !valid ? "Revisa el monto abonado." : `${values.length} seleccionadas \xB7 Total: ${money2(total)} \xB7 Abonado: ${money2(paid)} \xB7 Saldo: ${money2(total - paid)}`;
    $3("[data-submit]").disabled = busy || !valid || values.length < 2 || values.length > 20;
    $3("[data-more]").hidden = !cursor2;
  }
  async function search(more = false) {
    if (busy || !check()) return;
    busy = true;
    $3("[data-phone]").disabled = true;
    render();
    try {
      const newPhone = $3("[data-phone]").value.trim();
      if (!more) {
        phone = newPhone;
        selected.clear();
        rows2.clear();
        cursor2 = null;
        requestId = null;
      }
      const { data } = await call("multiQuoteOptions", { ...context(), phone, cursor: more ? cursor2 : null, ...sale ? { saleId: sale.id } : {} });
      for (const row of [...data.rows, ...data.selected || []]) rows2.set(row.id, row);
      if (!more) for (const row of data.selected || []) selected.set(row.id, row);
      cursor2 = data.next;
      $3("[data-status]").textContent = rows2.size ? "Selecciona al menos dos cotizaciones." : "No hay cotizaciones disponibles.";
    } catch (e) {
      $3("[data-status]").textContent = e.message || "No se pudo buscar.";
    } finally {
      busy = false;
      $3("[data-phone]").disabled = false;
      render();
    }
  }
  $3("[data-search]").addEventListener("submit", (e) => {
    e.preventDefault();
    search();
  });
  $3("[data-more]").onclick = () => search(true);
  $3("[data-filter]").oninput = render;
  $3("[data-paid]").oninput = () => {
    requestId = null;
    render();
  };
  $3("[data-usd]").onchange = () => {
    requestId = null;
    $3("[data-paid]").value = "";
    render();
  };
  $3("[data-phone]").oninput = () => {
    selected.clear();
    rows2.clear();
    cursor2 = null;
    requestId = null;
    render();
  };
  async function download() {
    const blob = await paymentPdf(documentData), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url;
    a.download = "PitStop-" + documentData.number + ".pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 6e4);
  }
  $3("[data-save]").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy || !check()) return;
    busy = true;
    $3("[data-phone]").disabled = true;
    render();
    $3("[data-fields]").disabled = true;
    $3("[data-status]").textContent = "Guardando venta\u2026";
    try {
      requestId ??= crypto.randomUUID();
      const payload = { ...context(), paidAmount: $3("[data-paid]").value.trim(), paymentCurrency: $3("[data-usd]").checked ? "USD" : "CRC", requestId, items: [...selected.values()].map((r) => ({ id: r.id, quoteVersion: r.quoteVersion })), ...sale ? { saleId: sale.id, version: sale.version } : { customer: { phone, name: $3("[data-name]").value.trim(), address: $3("[data-address]").value.trim() }, receipt: await receiptFile($3("[data-receipt]").files[0]) } };
      const { data } = await call("saveMultipleSale", payload);
      documentData = { ...data.paymentDocument, trackingCode: data.trackingCode };
      $3("[data-code]").value = data.trackingCode;
      $3("[data-success]").hidden = false;
      $3("[data-save]").hidden = true;
      $3("[data-search]").hidden = true;
      $3("[data-list]").replaceChildren();
      $3("[data-more]").hidden = true;
      $3("[data-status]").textContent = sale ? "Venta actualizada." : "Venta m\xFAltiple creada.";
      onSaved();
      try {
        await download();
      } catch {
        $3("[data-status]").textContent += " No se pudo descargar; usa Descargar PDF nuevamente.";
      }
    } catch (e2) {
      $3("[data-status]").textContent = e2.message || "No se pudo guardar. Vuelve a buscar las cotizaciones.";
    } finally {
      busy = false;
      $3("[data-phone]").disabled = false;
      $3("[data-fields]").disabled = false;
      if (!documentData) render();
    }
  });
  $3("[data-pdf]").onclick = () => download().catch(() => {
    $3("[data-status]").textContent = "No se pudo generar el PDF. Intenta nuevamente.";
  });
  $3("[data-copy]").onclick = async () => {
    try {
      await navigator.clipboard.writeText($3("[data-code]").value);
      $3("[data-status]").textContent = "C\xF3digo copiado.";
    } catch {
      $3("[data-code]").select();
      $3("[data-status]").textContent = "Copia el c\xF3digo seleccionado.";
    }
  };
  $3("[data-close]").onclick = () => {
    if (!busy) dialog.close();
  };
  dialog.addEventListener("cancel", (e) => {
    if (busy) e.preventDefault();
  });
  const open = async (item) => {
    if (!check()) return;
    sale = item || null;
    selected.clear();
    rows2.clear();
    cursor2 = null;
    phone = "";
    requestId = null;
    documentData = null;
    $3("[data-filter]").value = "";
    $3("[data-phone]").value = sale?.customer?.phone || "";
    $3("[data-phone]").readOnly = !!sale;
    $3("[data-save]").reset();
    $3("[data-usd]").checked = sale?.paymentDocument?.currency === "USD";
    $3("[data-paid]").value = sale?.paymentDocument?.customPayment ? (sale.paymentDocument.paidMinor / 100).toFixed(2) : "";
    $3("[data-save]").hidden = false;
    $3("[data-search]").hidden = false;
    $3("[data-success]").hidden = true;
    $3("[data-status]").textContent = "";
    render();
    dialog.showModal();
    if (sale) await search();
  };
  open.close = () => {
    dialog.close();
    selected.clear();
    rows2.clear();
    documentData = null;
    $3("[data-list]").replaceChildren();
    $3("[data-code]").value = "";
  };
  return open;
}

// outputs/pitstop-owner/dist/testimonials.js?v=20261004d
function confirmRemoval() {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog"), title = document.createElement("h2"), text = document.createElement("p"), actions = document.createElement("div"), back = document.createElement("button"), remove = document.createElement("button");
    title.textContent = "Eliminar testimonio";
    text.textContent = "Se retirar\xE1 esta imagen de la galer\xEDa y de la p\xE1gina p\xFAblica.";
    actions.className = "management-actions";
    back.textContent = "Cancelar";
    remove.textContent = "Eliminar";
    remove.className = "danger";
    back.type = remove.type = "button";
    back.addEventListener("click", () => dialog.close("cancel"));
    remove.addEventListener("click", () => dialog.close("remove"));
    dialog.addEventListener("close", () => {
      const approved = dialog.returnValue === "remove";
      dialog.remove();
      resolve(approved);
    }, { once: true });
    dialog.append(title, text, actions);
    actions.append(back, remove);
    document.body.append(dialog);
    dialog.showModal();
    back.focus();
  });
}
function initTestimonials({ call }) {
  const $3 = (id) => document.getElementById(id);
  let busy = false, generation2 = 0, requestId = null;
  function show(testimonials) {
    $3("admin-business").hidden = testimonials;
    $3("testimonials-panel").hidden = !testimonials;
    $3("business-tab").classList.toggle("selected", !testimonials);
    $3("testimonials-tab").classList.toggle("selected", testimonials);
  }
  function render(items) {
    const list = $3("testimonial-list");
    list.replaceChildren();
    $3("testimonial-count").textContent = items.length + " / 12 im\xE1genes";
    for (const item of items) {
      const card = document.createElement("article"), img = document.createElement("img"), title = document.createElement("p"), button = document.createElement("button");
      img.src = "https://pitstop-cbe24.web.app/api/public?image=" + item.id;
      img.alt = item.caption;
      img.loading = "lazy";
      title.textContent = item.caption;
      button.textContent = "\xD7";
      button.type = "button";
      button.className = "testimonial-remove";
      button.title = "Eliminar testimonio";
      button.setAttribute("aria-label", "Eliminar testimonio: " + item.caption);
      button.addEventListener("click", async () => {
        if (busy) return;
        busy = true;
        if (!await confirmRemoval()) {
          busy = false;
          return;
        }
        button.disabled = true;
        const stamp = generation2;
        try {
          const { data } = await call("ownerTestimonials", { action: "remove", id: item.id });
          if (stamp !== generation2) return;
          render(data.items);
          $3("testimonial-state").textContent = "Testimonio retirado. El cambio puede tardar un minuto en verse en la p\xE1gina p\xFAblica.";
        } catch {
          $3("testimonial-state").textContent = "No se pudo retirar el testimonio.";
        } finally {
          busy = false;
          button.disabled = false;
        }
      });
      card.className = "testimonial-tile";
      card.append(img, title, button);
      list.append(card);
    }
  }
  async function load() {
    const stamp = ++generation2;
    $3("testimonial-state").textContent = "Cargando\u2026";
    try {
      const { data } = await call("ownerTestimonials", { action: "list" });
      if (stamp !== generation2) return;
      render(data.items);
      $3("testimonial-state").textContent = data.items.length ? `${data.items.length} testimonios publicados.` : "Todav\xEDa no hay testimonios publicados.";
    } catch {
      if (stamp === generation2) $3("testimonial-state").textContent = "No se pudo cargar. Revisa tu acceso y vuelve a intentarlo.";
    }
  }
  $3("business-tab").addEventListener("click", () => show(false));
  $3("testimonials-tab").addEventListener("click", () => {
    show(true);
    load();
  });
  $3("testimonial-form").addEventListener("input", () => {
    requestId = null;
  });
  $3("testimonial-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    busy = true;
    const stamp = generation2;
    $3("testimonial-fields").disabled = true;
    $3("testimonial-state").textContent = "Publicando\u2026";
    requestId ??= crypto.randomUUID();
    try {
      const image = await receiptFile($3("testimonial-image").files[0]);
      if (!image) throw new Error();
      const { data } = await call("ownerTestimonials", { action: "publish", id: requestId, caption: $3("testimonial-caption").value.trim(), image });
      if (stamp !== generation2) return;
      render(data.items);
      $3("testimonial-form").reset();
      requestId = null;
      $3("testimonial-state").textContent = "Publicado. Aparecer\xE1 en la p\xE1gina p\xFAblica en aproximadamente un minuto.";
    } catch {
      $3("testimonial-state").textContent = "No se pudo publicar. Usa una imagen de hasta 4 MB y revisa si ya tienes 12 testimonios.";
    } finally {
      busy = false;
      $3("testimonial-fields").disabled = false;
    }
  });
  return () => {
    generation2++;
    $3("testimonial-form").reset();
    $3("testimonial-list").replaceChildren();
    $3("testimonial-state").textContent = "";
    show(false);
  };
}

// outputs/pitstop-owner/dist/config.js
var firebaseConfig = {
  apiKey: "AIzaSyATSzfKdW4KHc5IRsZh5rDJoOQyqroojQ4",
  authDomain: "pitstop-cbe24.firebaseapp.com",
  projectId: "pitstop-cbe24",
  appId: "1:90657894963:web:9f7ae390f8c679a7c46946"
};
var region = "us-central1";
var appCheckSiteKey = "6LeDqMotAAAAAJ_CNs1-e59S8--oW2IQP43-1n1O";

// outputs/pitstop-owner/dist/model.js
var shift = (day, n) => new Date(Date.parse(day + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
var amount = (row, currency) => Number(row?.[currency === "USD" ? "totalCents" : "totalCrcMinor"] || 0);
function summarize(data, currency) {
  const byDay = new Map(data.days.map((row2) => [row2.day, row2]));
  const row = (day) => byDay.get(day) ?? { day, salesCount: 0 };
  const month = data.monthDays.map(row), current = Array.from({ length: 7 }, (_, i) => row(shift(data.monday, i))), previous = Array.from({ length: 7 }, (_, i) => row(shift(data.previous, i)));
  const elapsed = (Date.parse(data.today) - Date.parse(data.monday)) / 864e5 + 1;
  const sum = (rows2) => rows2.reduce((n, r) => n + amount(r, currency), 0), count = (rows2) => rows2.reduce((n, r) => n + (r.salesCount || 0), 0);
  const comparable = sum(previous.slice(0, elapsed)), weekTotal = sum(current);
  const highest = month.reduce((a, b) => amount(b, currency) > amount(a, currency) ? b : a, month[0]);
  const lowest = month.reduce((a, b) => amount(b, currency) < amount(a, currency) ? b : a, month[0]);
  return { today: row(data.today), month, current, previous, weekTotal, monthTotal: sum(month), monthCount: count(month), comparable, change: comparable ? (weekTotal - comparable) / comparable * 100 : null, highest, lowest };
}

// outputs/pitstop-owner/dist/render.js?v=20261015
var $ = (id) => document.getElementById(id);
var money = (minor, currency = "CRC") => new Intl.NumberFormat("es-CR", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);
var short = (minor, currency) => new Intl.NumberFormat("es-CR", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(minor / 100);
var date = (value) => new Intl.DateTimeFormat("es-CR", { timeZone: "America/Costa_Rica", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
function svgNode(tag, attrs = {}, text) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text !== void 0) node.textContent = text;
  return node;
}
function chart(target, labels, series, currency, title) {
  const container = $(target);
  container.replaceChildren();
  const width = 560, height = 240, left = 70, bottom = 34, top = 20, plotH = height - bottom - top, plotW = width - left - 12;
  const max = Math.max(100, ...series.flatMap((s) => s.values.filter((v) => v !== null))) * 1.15;
  const svg = svgNode("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": title });
  svg.append(svgNode("title", {}, title));
  for (let i = 0; i < 4; i++) {
    const y = top + plotH * i / 3, value = max * (1 - i / 3);
    svg.append(svgNode("line", { x1: left, y1: y, x2: width, y2: y, stroke: "#e9ecf1" }), svgNode("text", { x: left - 8, y: y + 4, "text-anchor": "end", fill: "#9196a0", "font-size": 10 }, short(value, currency)));
  }
  const slot = plotW / labels.length, bar = Math.min(24, slot * 0.72 / series.length);
  labels.forEach((label, i) => {
    if (labels.length < 10 || i % 3 === 0 || i === labels.length - 1) svg.append(svgNode("text", { x: left + slot * (i + 0.5), y: height - 10, "text-anchor": "middle", fill: "#8a8f99", "font-size": 10 }, label));
    series.forEach((s, j) => {
      const value = s.values[i];
      if (value === null) return;
      const h = value / max * plotH, rect = svgNode("rect", { x: left + slot * (i + 0.5) + (j - series.length / 2) * bar, y: top + plotH - h, width: Math.max(2, bar - 3), height: Math.max(1, h), rx: 2, fill: s.color });
      rect.append(svgNode("title", {}, `${s.name} \xB7 ${label}: ${money(value, currency)}`));
      svg.append(rect);
    });
  });
  container.append(svg);
}
function renderOverview(data, currency) {
  const model = summarize(data, currency);
  renderMetrics(data.metrics, currency);
  $("today-total").textContent = money(amount(model.today, currency), currency);
  $("today-count").textContent = `${model.today.salesCount} ventas hoy`;
  $("week-total").textContent = money(model.weekTotal, currency);
  $("week-change").textContent = model.change === null ? "Sin base de comparaci\xF3n anterior" : `${model.change >= 0 ? "+" : ""}${model.change.toFixed(1)}% frente a los mismos d\xEDas de la semana anterior`;
  $("month-total").textContent = money(model.monthTotal, currency);
  $("month-count").textContent = `${model.monthCount} ventas aprobadas`;
  $("average").textContent = money(model.monthCount ? Math.round(model.monthTotal / model.monthCount) : 0, currency);
  $("week-note").textContent = `Semana del ${data.monday} frente a la del ${data.previous}. La semana actual est\xE1 en curso.`;
  chart("week-chart", ["Lun", "Mar", "Mi\xE9", "Jue", "Vie", "S\xE1b", "Dom"], [{ name: "Anterior", values: model.previous.map((r) => amount(r, currency)), color: "#c0c5ce" }, { name: "Actual", values: model.current.map((r) => r.day > data.today ? null : amount(r, currency)), color: "#dd1222" }], currency, "Ventas de esta semana y de la anterior, de lunes a domingo.");
  chart("month-chart", model.month.map((r) => r.day.slice(8)), [{ name: "Ventas", values: model.month.map((r) => amount(r, currency)), color: "#dd1222" }], currency, "Ventas por d\xEDa del mes seleccionado.");
  $("month-extremes").textContent = model.monthCount ? `Mayor: ${model.highest.day} \xB7 ${money(amount(model.highest, currency), currency)}. Menor: ${model.lowest.day} \xB7 ${money(amount(model.lowest, currency), currency)}. Se incluyen d\xEDas transcurridos sin ventas; en empates se muestra el primero.` : "No hay ventas aprobadas en este mes.";
  renderSellers(data, currency, $("seller-day").value || data.today);
}
function td(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}
function donut(id, parts, center, caption, format = String) {
  const box = $(id);
  box.replaceChildren();
  const total = parts.reduce((n, p) => n + p.value, 0), r = 70, length = 2 * Math.PI * r;
  const svg = svgNode("svg", { viewBox: "0 0 200 200", class: "donut-svg", role: "img", "aria-label": caption + ": " + parts.map((p) => p.label + " " + format(p.value)).join(", ") });
  svg.append(svgNode("circle", { cx: 100, cy: 100, r, fill: "none", stroke: "#edf0f4", "stroke-width": 22 }));
  let offset = 0;
  if (total > 0) for (const part of parts) {
    if (part.value <= 0) continue;
    const segment = length * part.value / total;
    const arc = svgNode("circle", { cx: 100, cy: 100, r, fill: "none", stroke: part.color, "stroke-width": 22, "stroke-dasharray": `${segment} ${length - segment}`, "stroke-dashoffset": -offset, transform: "rotate(-90 100 100)" });
    arc.append(svgNode("title", {}, part.label + ": " + format(part.value)));
    svg.append(arc);
    offset += segment;
  }
  svg.append(svgNode("text", { x: 100, y: 99, "text-anchor": "middle", "font-size": 25, "font-weight": 800, fill: "#20242d" }, center), svgNode("text", { x: 100, y: 120, "text-anchor": "middle", "font-size": 11, fill: "#737983" }, caption));
  box.append(svg);
  const legend = document.createElement("ul");
  legend.className = "donut-legend";
  for (const part of parts) {
    const li = document.createElement("li"), dot = document.createElement("i"), label = document.createElement("span"), value = document.createElement("strong");
    dot.style.background = part.color;
    label.textContent = part.label;
    value.textContent = format(part.value);
    li.append(dot, label, value);
    legend.append(li);
  }
  box.append(legend);
  if (!total) {
    const p = document.createElement("p");
    p.className = "donut-empty";
    p.textContent = "Sin datos para este mes.";
    box.append(p);
  }
}
function renderMetrics(m, currency) {
  if (!m) return;
  const f = m.currencies[currency], percent = (n, total) => total ? (100 * n / total).toFixed(1) + "%" : "0%";
  $("gross-profit").textContent = f.missing ? "Datos incompletos" : money(f.profit, currency);
  $("gross-cost").textContent = f.missing ? "Datos incompletos" : money(f.cost, currency);
  $("gross-margin").textContent = f.missing ? `${f.missing} ventas necesitan revisar costos o tipo de cambio.` : `Margen bruto: ${percent(f.profit, f.revenue)} sobre ventas aprobadas`;
  donut("sales-donut", [{ label: "Aprobadas", value: m.approved, color: "#dd1222" }, { label: "Por aprobar", value: m.pending, color: "#e6a236" }, { label: "Canceladas", value: m.cancelled, color: "#a2a9b6" }], String(m.approved + m.pending + m.cancelled), "ventas");
  if (f.missing || f.profit < 0) {
    $("profit-donut").replaceChildren();
    const p = document.createElement("p");
    p.textContent = f.missing ? "No se puede completar la gr\xE1fica hasta revisar los datos faltantes." : "La ganancia es negativa: " + money(f.profit, currency) + ". Los costos superan las ventas.";
    $("profit-donut").append(p);
  } else donut("profit-donut", [{ label: "Ganancia bruta", value: f.profit, color: "#dd1222" }, { label: "Repuesto + env\xEDo", value: f.cost, color: "#303946" }], percent(f.profit, f.revenue), "margen bruto", (n) => money(n, currency));
  const c = m.conversion;
  donut("conversion-donut", [{ label: "Venta aprobada", value: c.approved, color: "#dd1222" }, { label: "Por aprobar", value: c.pending, color: "#e6a236" }, { label: "Sin venta aprobada", value: c.other, color: "#bfc6d0" }], percent(c.approved, c.total), "conversi\xF3n");
  const colors = ["#dd1222", "#303946", "#e6a236", "#74869d", "#bb6574"];
  donut("sellers-donut", m.sellers.map((s, i) => ({ label: s.name, value: s.count, color: colors[i % colors.length] })), String(m.approved), "ventas aprobadas");
}
function empty(body, cols, text) {
  const row = document.createElement("tr"), cell = td(text);
  cell.colSpan = cols;
  cell.className = "empty";
  row.append(cell);
  body.append(row);
}
function renderSellers(data, currency, day) {
  const body = $("seller-rows");
  body.replaceChildren();
  const row = data.days.find((d) => d.day === day);
  const sellers = Object.values(row?.sellers ?? {}).sort((a, b) => amount(b, currency) - amount(a, currency));
  if (!sellers.length) {
    empty(body, 4, "No hay ventas aprobadas en este d\xEDa.");
    return;
  }
  for (const seller of sellers) {
    const tr = document.createElement("tr"), action = td(""), button = document.createElement("button");
    button.type = "button";
    button.textContent = "Ver ventas";
    button.setAttribute("aria-label", `Ver ventas de ${seller.name}`);
    button.addEventListener("click", () => document.dispatchEvent(new CustomEvent("owner:seller-sales", { detail: { seller: seller.name, day } })));
    action.append(button);
    tr.append(td(seller.name), td(seller.salesCount), td(money(amount(seller, currency), currency)), action);
    body.append(tr);
  }
}
function renderHistory(rows2, currency, target = "history-rows") {
  const body = $(target);
  body.replaceChildren();
  if (!rows2.length) {
    empty(body, 6, "No hay registros para estas fechas.");
    return;
  }
  for (const item of rows2) {
    const tr = document.createElement("tr"), product = td(item.product);
    if (item.isTest || item.delivery === "test_only") {
      const badge = document.createElement("span");
      badge.className = "test-tag";
      badge.textContent = "Prueba t\xE9cnica";
      product.append(badge);
    }
    if (item.kind === "sales") {
      const status = document.createElement("span");
      status.className = "sale-status " + (item.status || "registered");
      status.textContent = { pending: "Por aprobar", approved: "Aprobada", registered: "Aprobada", cancelled: "Cancelada", deleted: "Eliminada" }[item.status] || "Aprobada";
      product.append(document.createElement("br"), status);
    }
    const detail = td(""), button = document.createElement("button");
    button.textContent = "Ver detalle";
    button.addEventListener("click", () => showDetail(item));
    detail.append(button);
    tr.append(td(date(item.createdAt)), td(item.seller || "Sin vendedor"), product, td(item.saleType === "multiple" ? "Por repuesto" : item.shippingOrigin || "USA"), td(money(amount(item, currency), currency)), detail);
    body.append(tr);
  }
}
function showDetail(item) {
  const fields = $("detail-fields");
  fields.replaceChildren();
  const customer = item.customer;
  const data = [["Estado", item.kind === "sales" ? { pending: "Por aprobar", approved: "Aprobada", registered: "Aprobada", cancelled: "Cancelada", deleted: "Eliminada" }[item.status] || "Aprobada" : "C\xE1lculo"], ["Fecha", date(item.createdAt)], ["Vendedor", item.seller || "Sin vendedor"], ["Producto", item.product], ["Origen", item.saleType === "multiple" ? "Por repuesto" : item.shippingOrigin || "USA"], ["Peso", `${item.weightGrams / 1e3} kg`], ["Costo", money(item.costCents, "USD")], ["Env\xEDo", money(item.shippingCents, "USD")], ["Subtotal", money(item.subtotalCents, "USD")], ["Porcentaje", item.saleType === "multiple" ? "Seg\xFAn cada repuesto" : `${item.markupBps / 100}%`], ["Total antes del descuento", money(item.totalBeforeDiscountCents ?? item.totalCents, "USD")], ["Descuento", `${item.discountPercent ?? 0}% \xB7 ${money(item.discountCents ?? 0, "USD")}`], ["Ganancia bruta USD", money(item.profitCents, "USD")], ["Total USD", money(item.totalCents, "USD")], ["Total CRC", item.totalCrcMinor == null ? "Sin conversi\xF3n" : money(item.totalCrcMinor)], ["Tipo de cambio", item.exchangeRateCents ? `${money(item.exchangeRateCents)} por USD` : "Sin tasa"], ["Moneda del comprobante", item.paymentDocument?.currency || "CRC"], ["Monto abonado", item.paymentDocument ? money(item.paymentDocument.paidMinor, item.paymentDocument.currency) : "20% habitual"], ["Saldo pendiente", item.paymentDocument ? money(item.paymentDocument.balanceMinor, item.paymentDocument.currency) : "Disponible al recuperar comprobante"], ["Referencia", item.id], ["Venta asociada", item.saleId || item.calculationId || "Sin venta"]];
  if (item.customerPhone && !customer) data.push(["Tel\xE9fono del cliente", "+" + item.customerPhone]);
  if (customer) data.push(["Cliente", customer.name || "Sin nombre"], ["Tel\xE9fono", customer.phone], ["Direcci\xF3n", customer.address]);
  for (const [label, value] of data) {
    const row = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    row.append(dt, dd);
    fields.append(row);
  }
  if (customer?.link) {
    try {
      const url = new URL(customer.link);
      if (["http:", "https:"].includes(url.protocol)) {
        const row = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd"), a = document.createElement("a");
        dt.textContent = "Ubicaci\xF3n";
        a.href = url.href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "Abrir enlace de entrega";
        dd.append(a);
        row.append(dt, dd);
        fields.append(row);
      }
    } catch {
    }
  }
  const linkRow = document.createElement("div"), linkLabel = document.createElement("dt"), linkValue = document.createElement("dd");
  linkLabel.textContent = "Enlace del repuesto";
  linkValue.textContent = "Sin enlace registrado";
  try {
    const url = new URL(item.productUrl);
    if (["http:", "https:"].includes(url.protocol)) {
      const a = document.createElement("a");
      a.href = url.href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = url.href;
      linkValue.replaceChildren(a);
    }
  } catch {
  }
  linkRow.append(linkLabel, linkValue);
  fields.append(linkRow);
  if (item.productUrl2) {
    try {
      const url = new URL(item.productUrl2);
      if (["http:", "https:"].includes(url.protocol)) {
        const row = document.createElement("div"), label = document.createElement("dt"), value = document.createElement("dd"), a = document.createElement("a");
        label.textContent = "Segundo enlace del repuesto";
        a.href = url.href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = url.href;
        value.append(a);
        row.append(label, value);
        fields.append(row);
      }
    } catch {
    }
  }
  if (item.items) {
    for (const part of item.items) {
      const row = document.createElement("div"), label = document.createElement("dt"), value = document.createElement("dd");
      label.textContent = part.product;
      value.textContent = `Total: ${money(part.totalMinor, part.currency || "CRC")} \xB7 Adelanto: ${money(part.paidMinor, part.currency || "CRC")} \xB7 Saldo: ${money(part.balanceMinor, part.currency || "CRC")} \xB7 ${part.arrival}`;
      for (const link of [part.productUrl, part.productUrl2]) {
        try {
          const u = new URL(link);
          if (["https:", "http:"].includes(u.protocol)) {
            const a = document.createElement("a");
            a.href = u.href;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = " Abrir repuesto \u2197";
            value.append(a);
          }
        } catch {
        }
      }
      row.append(label, value);
      fields.append(row);
    }
  }
  const actions = $("detail-actions");
  actions.replaceChildren();
  if (item.kind === "sales") {
    const add = (label, event, action) => {
      const button = document.createElement("button");
      button.textContent = label;
      if (action === "delete" || action === "cancel") button.className = "danger";
      button.addEventListener("click", () => document.dispatchEvent(new CustomEvent(event, { detail: { item, action } })));
      actions.append(button);
    };
    if (item.receipt) add("Ver comprobante", "owner:receipt");
    if (item.status !== "deleted") {
      add("Editar venta", "owner:edit");
      add("Editar abono", "owner:payment");
    }
    if (item.status === "pending") add("Aprobar venta", "owner:action", "approve");
    if (["registered", "approved", "pending"].includes(item.status)) add("Marcar cancelada", "owner:action", "cancel");
    if (item.status !== "deleted") add("Eliminar venta", "owner:action", "delete");
    if (["cancelled", "deleted"].includes(item.status)) add(item.status === "deleted" ? "Restaurar venta" : "Reactivar venta", "owner:action", "restore");
  }
  if (item.kind === "calculations") {
    const button = document.createElement("button");
    button.textContent = "Eliminar c\xE1lculo";
    button.className = "danger";
    button.addEventListener("click", () => document.dispatchEvent(new CustomEvent("owner:delete-calculation", { detail: { item } })));
    actions.append(button);
  }
  $("detail-dialog").showModal();
}
$("close-detail").addEventListener("click", () => {
  $("detail-dialog").close();
});

// outputs/pitstop-owner/dist/app.js
var $2 = (id) => document.getElementById(id);
var auth;
var authApi;
var api;
var overview;
var rows = [];
var cursor = null;
var kind = "pending";
var generation = 0;
var historyGeneration = 0;
function notice(text, error = false) {
  $2("notice").textContent = text;
  $2("notice").classList.toggle("error", error);
}
function errorMessage(error) {
  return error.code === "functions/permission-denied" ? "Clave incorrecta o acceso caducado. Introduce la clave del due\xF1o." : error.code === "functions/resource-exhausted" ? "Demasiados intentos. Espera 15 minutos antes de volver a intentarlo." : "No se pudo completar la consulta. Revisa la conexi\xF3n e intenta de nuevo.";
}
function clearPrivate() {
  openPaymentEditor.close();
  openMultipleEdit.close();
  clearTestimonials();
  sellerSalesGeneration++;
  sellerSalesRows = [];
  sellerSalesCursor = null;
  sellerSelection = null;
  $2("seller-sales-dialog").close();
  $2("seller-sales-rows").replaceChildren();
  $2("seller-sales-title").textContent = "Ventas del vendedor";
  $2("seller-sales-subtitle").textContent = "";
  $2("seller-sales-state").textContent = "";
  generation++;
  historyGeneration++;
  overview = void 0;
  rows = [];
  cursor = null;
  $2("dashboard").hidden = true;
  $2("logout").hidden = true;
  $2("account").textContent = "";
  for (const id of ["today-total", "today-count", "week-total", "week-change", "month-total", "month-count", "average", "week-note", "month-extremes"]) $2(id).textContent = "";
  $2("week-chart").replaceChildren();
  $2("month-chart").replaceChildren();
  $2("history-rows").replaceChildren();
  $2("seller-rows").replaceChildren();
  $2("detail-dialog").close();
  $2("detail-fields").replaceChildren();
  $2("detail-actions").replaceChildren();
  $2("receipt-dialog").close();
  $2("receipt-image").removeAttribute("src");
  $2("edit-sale-dialog").close();
  $2("sale-action-dialog").close();
}
async function loadOverview() {
  const stamp = ++generation;
  try {
    const { data } = await api("ownerOverview")({ month: $2("month").value || void 0 });
    if (stamp !== generation || !auth.currentUser) return;
    overview = data;
    $2("month").value = data.month;
    $2("month").max = data.today.slice(0, 7);
    if (!$2("seller-day").value || !data.days.some((r) => r.day === $2("seller-day").value)) $2("seller-day").value = data.month === data.today.slice(0, 7) ? data.today : data.monthDays[0];
    $2("seller-day").max = data.today;
    renderOverview(data, $2("currency").value);
    $2("dashboard").hidden = false;
    $2("logout").hidden = false;
    $2("account").textContent = "Panel desbloqueado";
    $2("login-panel").hidden = true;
    notice("Actualizado. Las cotizaciones y las ventas se muestran por separado.");
  } catch (error) {
    if (stamp !== generation) return;
    if (error.code === "functions/permission-denied") {
      clearPrivate();
      $2("login-panel").hidden = false;
    }
    notice(errorMessage(error), true);
  }
}
async function loadHistory(reset = true) {
  const stamp = ++historyGeneration, from = $2("from").value, to = $2("to").value;
  if (from && to && from > to) {
    $2("history-state").textContent = "La fecha inicial debe ser anterior a la final.";
    return;
  }
  $2("more").disabled = true;
  $2("history-state").textContent = "Cargando registros\u2026";
  try {
    const { data } = await api("ownerHistory")({ kind, from, to, cursor: reset ? null : cursor });
    if (stamp !== historyGeneration || !auth.currentUser) return;
    rows = reset ? data.rows : [...rows, ...data.rows];
    cursor = data.next;
    renderHistory(rows, $2("currency").value);
    $2("more").hidden = !cursor;
    $2("history-state").textContent = `${rows.length} registros cargados${cursor ? " \xB7 Hay m\xE1s registros" : ""}.`;
  } catch (error) {
    if (stamp === historyGeneration) {
      $2("history-state").textContent = errorMessage(error);
      if (error.code === "functions/permission-denied") {
        clearPrivate();
        $2("login-panel").hidden = false;
        notice(errorMessage(error), true);
      }
    }
  } finally {
    if (stamp === historyGeneration) $2("more").disabled = false;
  }
}
$2("access-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $2("login").disabled = true;
  try {
    await api("ownerUnlock")({ key: $2("access-key").value });
    $2("access-key").value = "";
    await loadOverview();
    if (overview) await loadHistory();
  } catch (error) {
    notice(errorMessage(error), true);
  } finally {
    $2("login").disabled = false;
  }
});
$2("logout").addEventListener("click", async () => {
  clearPrivate();
  $2("login-panel").hidden = false;
  notice("Bloqueando panel\u2026");
  try {
    await api("ownerLock")({});
    await authApi.signOut(auth);
    await authApi.signInAnonymously(auth);
    notice("Panel bloqueado. Introduce la clave para volver a entrar.");
  } catch {
    await authApi.signOut(auth);
    notice("Acceso cerrado en este navegador. Recarga la p\xE1gina para entrar.");
  }
});
$2("refresh").addEventListener("click", async () => {
  await loadOverview();
  if (overview) await loadHistory();
});
$2("month").addEventListener("change", () => loadOverview());
$2("currency").addEventListener("change", () => {
  if (overview) renderOverview(overview, $2("currency").value);
  renderHistory(rows, $2("currency").value);
  renderHistory(sellerSalesRows, $2("currency").value, "seller-sales-rows");
});
$2("seller-day").addEventListener("change", async () => {
  const day = $2("seller-day").value;
  if (!day || !overview) return;
  if (!overview.days.some((r) => r.day === day)) {
    $2("month").value = day.slice(0, 7);
    await loadOverview();
  } else renderSellers(overview, $2("currency").value, day);
});
for (const [id, value] of [["pending-tab", "pending"], ["sales-tab", "sales"], ["calculations-tab", "calculations"]]) $2(id).addEventListener("click", () => {
  kind = value;
  rows = [];
  cursor = null;
  renderHistory(rows, $2("currency").value);
  for (const button of ["pending-tab", "sales-tab", "calculations-tab"]) {
    $2(button).classList.toggle("selected", button === id);
    $2(button).setAttribute("aria-pressed", String(button === id));
  }
  loadHistory();
});
$2("history-filters").addEventListener("submit", (e) => {
  e.preventDefault();
  loadHistory();
});
$2("clear-filters").addEventListener("click", () => {
  $2("from").value = "";
  $2("to").value = "";
  loadHistory();
});
$2("more").addEventListener("click", () => loadHistory(false));
async function start() {
  try {
    const base = "https://www.gstatic.com/firebasejs/12.19.0/";
    const [app, authentication, functions, check] = await Promise.all([import(base + "firebase-app.js"), import(base + "firebase-auth.js"), import(base + "firebase-functions.js"), import(base + "firebase-app-check.js")]);
    const firebase = app.initializeApp(firebaseConfig);
    check.initializeAppCheck(firebase, { provider: new check.ReCaptchaEnterpriseProvider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
    authApi = authentication;
    auth = authentication.getAuth(firebase);
    await authentication.setPersistence(auth, authentication.browserSessionPersistence);
    api = (name) => functions.httpsCallable(functions.getFunctions(firebase, region), name);
    await authentication.signInAnonymously(auth);
    $2("login").disabled = false;
    notice("Introduce la clave de acceso.");
    await loadOverview();
    if (overview) await loadHistory();
    else notice("Introduce la clave de acceso.");
  } catch (error) {
    notice(errorMessage(error), true);
  }
}
start();
var editing;
var actionPending;
var editRequest;
var editPayload;
var managementBusy = false;
var receiptGeneration = 0;
function managementError(error) {
  return error.code === "functions/aborted" ? "El registro fue modificado. Cierra y actualiza el historial para cargar su versi\xF3n actual." : error.code === "functions/invalid-argument" ? "Revisa vendedor, datos del cliente, importes y comprobante." : error.message && !error.code ? error.message : errorMessage(error);
}
async function reloadAfterChange() {
  rows = [];
  cursor = null;
  renderHistory(rows, $2("currency").value);
  $2("history-state").textContent = "Actualizando\u2026";
  $2("detail-dialog").close();
  await loadOverview();
  if (overview) {
    await loadHistory();
    if ($2("seller-sales-dialog").open) await loadSellerSales(true);
  }
}
document.addEventListener("owner:receipt", async (e) => {
  const stamp = ++receiptGeneration;
  $2("receipt-image").hidden = true;
  $2("receipt-image").removeAttribute("src");
  $2("receipt-state").textContent = "Cargando comprobante\u2026";
  $2("receipt-dialog").showModal();
  try {
    const { data } = await api("ownerReceipt")({ saleId: e.detail.item.id });
    if (stamp !== receiptGeneration || !$2("receipt-dialog").open) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(data.contentType)) throw new Error("Imagen no disponible.");
    $2("receipt-image").src = `data:${data.contentType};base64,${data.base64}`;
    $2("receipt-image").hidden = false;
    $2("receipt-state").textContent = "";
  } catch (error) {
    if (stamp === receiptGeneration) $2("receipt-state").textContent = managementError(error);
  }
});
$2("close-receipt").addEventListener("click", () => {
  receiptGeneration++;
  $2("receipt-dialog").close();
  $2("receipt-image").removeAttribute("src");
});
document.addEventListener("owner:edit", (e) => {
  if (e.detail.item.saleType === "multiple") {
    openMultipleEdit(e.detail.item);
    return;
  }
  editing = e.detail.item;
  editRequest = void 0;
  editPayload = void 0;
  $2("edit-sale-form").reset();
  $2("edit-error").textContent = "";
  const fields = { discount: String(editing.discountPercent ?? 0), url: editing.productUrl || "", url2: editing.productUrl2 || "", seller: editing.seller || "", product: editing.product, cost: (editing.costCents / 100).toFixed(2), weight: String(editing.weightGrams / 1e3), rate: (editing.exchangeRateCents / 100).toFixed(2), origin: editing.shippingOrigin || "USA", phone: editing.customer?.phone || "", name: editing.customer?.name || "", address: editing.customer?.address || "" };
  for (const [key, value] of Object.entries(fields)) $2("edit-" + key).value = value;
  $2("edit-sale-dialog").showModal();
});
$2("close-edit").addEventListener("click", () => {
  if (!managementBusy) $2("edit-sale-dialog").close();
});
$2("edit-sale-dialog").addEventListener("cancel", (e) => {
  if (managementBusy) e.preventDefault();
});
$2("edit-sale-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (managementBusy) return;
  managementBusy = true;
  $2("edit-fields").disabled = true;
  $2("close-edit").disabled = true;
  $2("edit-error").textContent = "Guardando\u2026";
  try {
    const clean = (id) => $2("edit-" + id).value.trim().replace(",", ".");
    const values = { discountPercent: Number($2("edit-discount").value), productUrl: $2("edit-url").value.trim(), productUrl2: $2("edit-url2").value.trim(), seller: $2("edit-seller").value.trim(), product: $2("edit-product").value.trim(), cost: clean("cost"), weight: clean("weight"), exchangeRate: clean("rate"), shippingOrigin: $2("edit-origin").value, customer: { phone: $2("edit-phone").value.trim(), name: $2("edit-name").value.trim(), address: $2("edit-address").value.trim() } };
    const receipt = await receiptFile($2("edit-receipt").files[0]);
    const payload = JSON.stringify({ saleId: editing.id, action: "edit", version: editing.version ?? 0, values, receipt });
    if (payload !== editPayload) {
      editPayload = payload;
      editRequest = crypto.randomUUID();
    }
    await api("ownerChangeSale")({ ...JSON.parse(payload), actionId: editRequest });
    $2("edit-sale-dialog").close();
    await reloadAfterChange();
    notice("Venta actualizada.");
  } catch (error) {
    $2("edit-error").textContent = managementError(error);
  } finally {
    managementBusy = false;
    $2("edit-fields").disabled = false;
    $2("close-edit").disabled = false;
  }
});
document.addEventListener("owner:action", (e) => {
  const { item, action } = e.detail;
  actionPending = { saleId: item.id, action, version: item.version ?? 0, actionId: crypto.randomUUID() };
  $2("action-title").textContent = { approve: "Aprobar venta", cancel: "Cancelar venta", delete: "Eliminar venta", restore: "Restaurar venta" }[action];
  $2("action-message").textContent = `${item.product}. ` + { approve: "Pasar\xE1 al historial como aprobada y sumar\xE1 en los totales de su fecha de venta.", cancel: "Se marcar\xE1 como cancelada y dejar\xE1 de sumar en los totales. Podr\xE1s reactivarla.", delete: "Se marcar\xE1 como eliminada y dejar\xE1 de sumar en los totales. Se conservar\xE1 para poder restaurarla.", restore: item.status === "deleted" && item.statusBeforeDeletion === "cancelled" ? "Volver\xE1 al estado cancelada." : "Recuperar\xE1 su estado anterior. Si estaba por aprobar, seguir\xE1 pendiente de aprobaci\xF3n." }[action];
  $2("action-error").textContent = "";
  $2("sale-action-dialog").showModal();
});
$2("action-back").addEventListener("click", () => {
  if (!managementBusy) $2("sale-action-dialog").close();
});
$2("sale-action-dialog").addEventListener("cancel", (e) => {
  if (managementBusy) e.preventDefault();
});
$2("action-confirm").addEventListener("click", async () => {
  if (managementBusy) return;
  managementBusy = true;
  $2("action-confirm").disabled = true;
  $2("action-back").disabled = true;
  try {
    const calculation = actionPending.calculationId;
    await api(calculation ? "ownerDeleteCalculation" : "ownerChangeSale")(actionPending);
    $2("sale-action-dialog").close();
    await reloadAfterChange();
    notice(calculation ? "C\xE1lculo eliminado." : "Estado de venta actualizado.");
  } catch (error) {
    $2("action-error").textContent = managementError(error);
  } finally {
    managementBusy = false;
    $2("action-confirm").disabled = false;
    $2("action-back").disabled = false;
  }
});
var sellerSelection = null;
var sellerSalesRows = [];
var sellerSalesCursor = null;
var sellerSalesGeneration = 0;
var sellerSalesBusy = false;
var sellerIdentity = (name) => String(name || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
document.addEventListener("owner:seller-sales", (e) => {
  sellerSelection = { ...e.detail };
  $2("seller-sales-title").textContent = `Ventas de ${sellerSelection.seller}`;
  $2("seller-sales-subtitle").textContent = `${sellerSelection.day} \xB7 Ventas aprobadas \xB7 Hora de Costa Rica`;
  $2("seller-sales-dialog").showModal();
  loadSellerSales(true);
});
function closeSellerSales() {
  sellerSalesGeneration++;
  sellerSalesBusy = false;
  $2("seller-sales-dialog").close();
}
$2("close-seller-sales").addEventListener("click", closeSellerSales);
$2("seller-sales-dialog").addEventListener("cancel", () => {
  sellerSalesGeneration++;
  sellerSalesBusy = false;
});
$2("seller-sales-more").addEventListener("click", () => {
  if (!sellerSalesBusy) loadSellerSales(false);
});
async function loadSellerSales(reset = true) {
  if (!sellerSelection || !$2("seller-sales-dialog").open) return;
  const stamp = ++sellerSalesGeneration, selection = { ...sellerSelection };
  sellerSalesBusy = true;
  if (reset) {
    sellerSalesRows = [];
    sellerSalesCursor = null;
    renderHistory([], $2("currency").value, "seller-sales-rows");
  }
  $2("seller-sales-more").hidden = true;
  $2("seller-sales-state").textContent = "Cargando ventas\u2026";
  try {
    let next = sellerSalesCursor, found = [];
    do {
      const { data } = await api("ownerHistory")({ kind: "sales", from: selection.day, to: selection.day, cursor: next });
      if (stamp !== sellerSalesGeneration || !$2("seller-sales-dialog").open) return;
      found.push(...data.rows.filter((item) => !item.isTest && item.delivery !== "test_only" && ["registered", "approved"].includes(item.status) && sellerIdentity(item.seller) === sellerIdentity(selection.seller)));
      next = data.next;
    } while (next && found.length < 50);
    sellerSalesRows = reset ? found : [...sellerSalesRows, ...found];
    sellerSalesCursor = next;
    renderHistory(sellerSalesRows, $2("currency").value, "seller-sales-rows");
    $2("seller-sales-state").textContent = sellerSalesRows.length ? `${sellerSalesRows.length} ventas cargadas${next ? " \xB7 Hay m\xE1s ventas" : ""}.` : "No hay ventas aprobadas de este vendedor en el d\xEDa seleccionado.";
    $2("seller-sales-more").hidden = !next;
  } catch (error) {
    if (stamp === sellerSalesGeneration) {
      $2("seller-sales-state").textContent = errorMessage(error);
      if (error.code === "functions/permission-denied") {
        clearPrivate();
        $2("login-panel").hidden = false;
      } else {
        $2("seller-sales-more").hidden = false;
        $2("seller-sales-more").textContent = "Reintentar";
      }
    }
  } finally {
    if (stamp === sellerSalesGeneration) sellerSalesBusy = false;
  }
}
document.addEventListener("owner:delete-calculation", (e) => {
  if (managementBusy) return;
  const item = e.detail.item;
  actionPending = { calculationId: item.id, quoteVersion: item.quoteVersion ?? 0 };
  $2("action-title").textContent = "Eliminar c\xE1lculo";
  $2("action-message").textContent = `${item.product}. Se quitar\xE1 del historial y de la b\xFAsqueda de cotizaciones. Si tiene una venta asociada, esa venta y sus importes se conservar\xE1n.`;
  $2("action-error").textContent = "";
  $2("sale-action-dialog").showModal();
});
var clearTestimonials = initTestimonials({ call: (name, payload) => api(name)(payload) });
var openMultipleEdit = initMultipleSale({ owner: true, call: (name, data) => api(name)(data), onSaved: () => reloadAfterChange() });
var openPaymentEditor = initPaymentEditor({ call: (name, data) => api(name)(data), onSaved: async () => {
  await reloadAfterChange();
  notice("Abono actualizado. El comprobante ya muestra el nuevo saldo.");
} });
document.addEventListener("owner:payment", (e) => openPaymentEditor(e.detail.item));
