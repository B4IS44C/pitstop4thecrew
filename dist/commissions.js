// outputs/pitstop-owner/dist/admin-shell.js
function initAdminShell() {
  const $2 = (id) => document.getElementById(id), business = $2("admin-business");
  function view(name) {
    if (!business) return;
    business.dataset.view = name;
    for (const id of ["business-tab", "history-nav", "delivery-nav"]) $2(id)?.classList.toggle("selected", id === { summary: "business-tab", history: "history-nav", delivery: "delivery-nav" }[name]);
    window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  if (business) {
    view("summary");
    $2("business-tab").addEventListener("click", () => view("summary"));
    for (const [id, name] of [["history-nav", "history"], ["delivery-nav", "delivery"]]) $2(id).addEventListener("click", () => {
      $2("business-tab").click();
      view(name);
      history.replaceState(null, "", name === "history" ? "#historial" : "#entregas");
    });
    for (const id of ["sellers-tab", "testimonials-tab"]) $2(id).addEventListener("click", () => {
      for (const n of ["history-nav", "delivery-nav"]) $2(n).classList.remove("selected");
      window.scrollTo({ top: 0 });
    });
    const route = () => {
      if (location.hash.startsWith("#entregas")) $2("delivery-nav").click();
      else if (location.hash === "#historial") $2("history-nav").click();
      else if (location.hash === "#equipo") $2("sellers-tab").click();
      else if (location.hash === "#galeria") $2("testimonials-tab").click();
    };
    const initialHash = location.hash;
    let routed = false;
    new MutationObserver(() => {
      if (!routed && !$2("dashboard").hidden) {
        routed = true;
        if (initialHash.startsWith("#entregas")) {
          $2("business-tab").click();
          view("delivery");
        } else route();
      }
    }).observe($2("dashboard"), { attributes: true, attributeFilter: ["hidden"] });
  }
  function enhance() {
    for (const table of document.querySelectorAll("table")) {
      if (!table.dataset.adaptive) {
        table.dataset.adaptive = "true";
        table.classList.add("adaptive-table");
        const wrap = table.closest(".table-wrap");
        if (wrap && !wrap.closest(".table-disclosure")) {
          const d = document.createElement("details"), s = document.createElement("summary");
          d.className = "table-disclosure";
          d.open = true;
          s.textContent = "Registros";
          wrap.before(d);
          d.append(s, wrap);
        }
      }
      const labels = [...table.querySelectorAll("thead th")].map((t) => t.textContent.trim());
      for (const row of table.querySelectorAll("tbody tr")) {
        if (row.dataset.adaptive || row.cells.length < 2) continue;
        row.dataset.adaptive = "true";
        const cells = [...row.cells], body = row.parentElement.id;
        let primary = body === "history-rows" || body === "seller-sales-rows" ? [2, 4] : body === "rows" ? [0, 1, 5] : body === "ad-rows" ? [1, 2] : body === "seller-rows" ? [0, 2] : [0, 1];
        cells.forEach((cell, i) => {
          cell.dataset.label = labels[i] || "Detalle";
          cell.classList.toggle("row-primary", primary.includes(i));
        });
        const anchor = cells[primary.find((i) => !cells[i].querySelector("input")) ?? primary[0]], toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "row-toggle";
        toggle.textContent = "\u2304";
        toggle.setAttribute("aria-label", "Mostrar detalles del registro");
        toggle.setAttribute("aria-expanded", "false");
        toggle.onclick = () => {
          const open = row.dataset.expanded !== "true";
          row.dataset.expanded = String(open);
          toggle.setAttribute("aria-expanded", String(open));
          toggle.setAttribute("aria-label", open ? "Ocultar detalles del registro" : "Mostrar detalles del registro");
          toggle.textContent = open ? "\u2303" : "\u2304";
        };
        anchor.prepend(toggle);
      }
    }
  }
  enhance();
  let scheduled = false;
  const observer = new MutationObserver((records) => {
    if (!records.some((r) => r.type === "childList") || scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhance();
    });
  });
  observer.observe(document.querySelector("main"), { childList: true, subtree: true });
  for (const d of document.querySelectorAll("dialog")) observer.observe(d, { childList: true, subtree: true });
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

// outputs/pitstop-owner/dist/change-key.js
function requestChangeKey() {
  return new Promise((resolve, reject) => {
    const dialog = document.createElement("dialog");
    dialog.className = "change-key-dialog";
    dialog.innerHTML = '<form><h2>Autorizar cambio</h2><p>Introduce la clave del administrador para realizar esta acci\xF3n.</p><label>Clave del administrador<input type="password" required maxlength="128" autocomplete="off" autofocus></label><div class="management-actions"><button type="button">Cancelar</button><button type="submit" class="primary">Confirmar cambio</button></div></form>';
    const finish = (value) => {
      dialog.querySelector("input").value = "";
      dialog.close();
      dialog.remove();
      value ? resolve(value) : reject(new Error("Cambio cancelado."));
    };
    dialog.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      finish(dialog.querySelector("input").value);
    };
    dialog.querySelector("button[type=button]").onclick = () => finish(null);
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      finish(null);
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}

// outputs/pitstop-owner/dist/commissions.js
var $ = (id) => document.getElementById(id);
var money = (n, c = $("commission-currency").value) => new Intl.NumberFormat("es-CR", { style: "currency", currency: c }).format(n / 100);
var date = (d) => d ? new Date(d).toLocaleDateString("es-CR", { timeZone: "America/Costa_Rica" }) : "\u2014";
var month = (d) => d ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica", year: "numeric", month: "2-digit" }).format(new Date(d)) : "";
var call;
var data;
var visible = [];
var selected = /* @__PURE__ */ new Set();
var busy = false;
var stamp = 0;
var payRequest = null;
function status(s) {
  $("state").textContent = s;
}
function lock(value) {
  busy = value;
  for (const id of ["seller", "commission-currency", "view", "month", "all-time", "refresh-payments", "percent", "record-payment", "confirm-payment", "cancel-payment"]) $(id).disabled = value;
  if (!value) $("record-payment").disabled = !selected.size || data?.bps == null;
}
async function load() {
  const n = ++stamp;
  selected.clear();
  data = null;
  render();
  status("Cargando ventas y pagos\u2026");
  try {
    const result = await call({ action: "list", seller: $("seller").value });
    if (n !== stamp) return;
    data = result;
    $("percent").value = data.bps == null ? "" : data.bps / 100;
    $("payment-day").value = data.today;
    $("payment-day").max = data.today;
    render();
    status("Actualizado.");
  } catch (e) {
    status(e.message || "No se pudo cargar.");
  }
}
function render() {
  const paid = $("view").value === "paid", currency = $("commission-currency").value, m = $("month").value, search = $("search").value.trim().toLocaleLowerCase("es");
  $("month-label").firstChild.textContent = paid ? "Mes de pago" : "Mes de venta";
  $("payment-controls").hidden = paid;
  $("select-all").hidden = paid;
  $("rows").replaceChildren();
  $("summary").replaceChildren();
  if (!data) {
    $("record-payment").disabled = true;
    visible = [];
    $("selected-total").textContent = "";
    return;
  }
  const source = paid ? data.paid.filter((s) => s.currency === currency).map((s) => ({ ...s, amount: s, when: s.saleDate })) : data.pending.map((s) => ({ ...s, amount: s[currency], when: s.createdAt }));
  visible = source.filter((s) => (!m || (paid ? s.day.slice(0, 7) : month(s.when)) === m) && (!search || [s.id, s.product, s.customerName].join(" ").toLocaleLowerCase("es").includes(search)));
  const ids = new Set(visible.map((s) => s.id));
  selected = new Set([...selected].filter((id) => ids.has(id)));
  let total = 0, profit = 0, commission = 0, missing = 0;
  for (const s of visible) {
    total += s.amount?.totalMinor || 0;
    commission += s.amount?.commissionMinor || 0;
    if (s.amount?.profitMinor == null) missing++;
    else profit += s.amount.profitMinor;
    const tr = document.createElement("tr"), check = document.createElement("input");
    check.type = "checkbox";
    check.checked = paid || selected.has(s.id);
    check.disabled = paid || !s.amount || data.bps == null || busy;
    check.setAttribute("aria-label", "Seleccionar " + s.product);
    check.onchange = () => {
      check.checked ? selected.add(s.id) : selected.delete(s.id);
      selection();
    };
    const cell = document.createElement("td");
    cell.append(check);
    tr.append(cell);
    const values = [s.product + (s.customerName ? " \xB7 " + s.customerName : "") + " \xB7 " + s.id, date(s.when), s.amount ? money(s.amount.totalMinor) : "No disponible", s.amount?.profitMinor == null ? "Sin costo registrado" : money(s.amount.profitMinor), s.amount ? money(s.amount.commissionMinor) + (paid ? " \xB7 " + s.bps / 100 + "%" : "") : "\u2014", paid ? "Pagada \xB7 " + s.day : "Pendiente"];
    for (const v of values) {
      const td = document.createElement("td");
      td.textContent = v;
      tr.append(td);
    }
    $("rows").append(tr);
  }
  for (const [label, value] of [["Total vendido", money(total)], ["Ganancia bruta", money(profit) + (missing ? " *" : "")], [paid ? "Comisiones pagadas" : "Acumulado por pagar", data.bps == null && !paid ? "Defin\xED el %" : money(commission)], ["Ventas", String(visible.length)]]) {
    const a = document.createElement("article");
    a.className = "panel";
    const t = document.createElement("span"), v = document.createElement("strong");
    t.textContent = label;
    v.textContent = value;
    a.append(t, v);
    $("summary").append(a);
  }
  $("count").textContent = visible.length + " ventas" + (missing ? " \xB7 * Hay costos sin registrar" : "");
  $("paid-lifetime").textContent = "Pagado a " + $("seller").value + " en todo el tiempo: " + money(data.paid.filter((p) => p.currency === currency).reduce((n, p) => n + p.commissionMinor, 0)) + " \xB7 " + currency;
  $("rate-note").textContent = data.bps == null ? "Sin porcentaje configurado. Guardalo para habilitar pagos." : "Porcentaje guardado: " + data.bps / 100 + "%. Los pagos anteriores conservan su porcentaje.";
  selection();
}
function selection() {
  const sum = visible.filter((s) => selected.has(s.id)).reduce((n, s) => n + (s.amount?.commissionMinor || 0), 0);
  $("selected-total").textContent = selected.size + " seleccionadas \xB7 " + money(sum);
  $("record-payment").disabled = busy || !selected.size || data?.bps == null;
  $("select-all").checked = visible.length > 0 && visible.every((s) => selected.has(s.id));
}
$("select-all").onchange = () => {
  selected.clear();
  if ($("select-all").checked) visible.filter((s) => s.amount).slice(0, 100).forEach((s) => selected.add(s.id));
  render();
};
for (const id of ["commission-currency", "view", "month", "search"]) $(id).addEventListener(id === "search" ? "input" : "change", () => {
  selected.clear();
  render();
});
$("seller").onchange = load;
$("refresh-payments").onclick = load;
$("all-time").onclick = () => {
  $("month").value = "";
  render();
};
$("rate-form").onsubmit = async (e) => {
  e.preventDefault();
  if (busy) return;
  lock(true);
  try {
    await call({ action: "rate", seller: $("seller").value, percent: $("percent").value }, true);
    await load();
    status("Porcentaje guardado.");
  } catch (e2) {
    status(e2.message);
  } finally {
    lock(false);
  }
};
$("record-payment").onclick = () => {
  if (!data || !selected.size || !$("payment-day").value) return status("Seleccion\xE1 ventas y fecha de pago.");
  $("confirm-text").textContent = $("seller").value + " \xB7 " + $("selected-total").textContent + " \xB7 " + data.bps / 100 + "% sobre el total de cada venta.";
  payRequest = { action: "pay", seller: $("seller").value, currency: $("commission-currency").value, bps: data.bps, saleIds: [...selected], totals: Object.fromEntries(visible.filter((s) => selected.has(s.id)).map((s) => [s.id, s.amount.totalMinor])), day: $("payment-day").value, requestId: crypto.randomUUID() };
  $("payment-confirm").showModal();
};
$("cancel-payment").onclick = () => $("payment-confirm").close();
$("payment-confirm").addEventListener("cancel", (e) => {
  if (busy) e.preventDefault();
});
$("confirm-payment").onclick = async () => {
  if (busy) return;
  lock(true);
  try {
    await call(payRequest, true);
    $("payment-confirm").close();
    await load();
    status("Pago registrado. Las ventas seleccionadas pasaron al historial.");
  } catch (e) {
    status(e.message);
    $("payment-confirm").close();
  } finally {
    lock(false);
  }
};
async function start() {
  try {
    const base = "https://www.gstatic.com/firebasejs/12.19.0/";
    const [a, b, c, d] = await Promise.all(["app", "auth", "functions", "app-check"].map((n) => import(base + "firebase-" + n + ".js")));
    const app = a.initializeApp(firebaseConfig);
    d.initializeAppCheck(app, { provider: new d.ReCaptchaEnterpriseProvider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
    const auth = b.getAuth(app);
    await b.setPersistence(auth, b.browserSessionPersistence);
    await b.signInAnonymously(auth);
    const team = (await c.httpsCallable(c.getFunctions(app, region), "ownerSellers")({ action: "list" })).data.allNames;
    $("seller").replaceChildren(...team.map((name) => new Option(name, name)));
    const fn = c.httpsCallable(c.getFunctions(app, region), "ownerCommissions");
    call = async (payload, write = false) => {
      const input = { ...payload };
      if (write) input.changeKey = await requestChangeKey();
      try {
        return (await fn(input)).data;
      } finally {
        delete input.changeKey;
      }
    };
    await load();
  } catch (e) {
    status(e.message || "No se pudo conectar.");
  }
}
start();
initAdminShell();
