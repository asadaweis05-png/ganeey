const navItems = document.querySelectorAll("[data-view-target]");
const views = document.querySelectorAll(".view");
const sidebar = document.querySelector("[data-sidebar]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const modal = document.querySelector("[data-customer-modal]");
const actionModal = document.querySelector("[data-action-modal]");
const customerForm = document.querySelector("[data-customer-form]");
const customersTable = document.querySelector("[data-customers-table]");
const formStatus = document.querySelector("[data-form-status]");
const currentCustomer = document.querySelector("[data-current-customer]");
const measureBreadcrumb = document.querySelector("[data-measure-breadcrumb]");
const savedMeasures = document.querySelector("[data-saved-measures]");
const searchInput = document.querySelector(".search input");
const syncStatus = document.querySelector("[data-sync-status]");
const recentInvoices = document.querySelector("[data-recent-invoices]");
const ordersBoard = document.querySelector("[data-orders-board]");
const invoiceTable = document.querySelector("[data-invoice-table]");
const invoicePreview = document.querySelector("[data-invoice-preview]");
const profileMeasures = document.querySelector("[data-profile-measures]");
const styleNotes = document.querySelector("[data-style-notes]");
const orderHistory = document.querySelector("[data-order-history]");

const supabaseConfig = {
  url: "https://tfsxyxmbueosgfkwfnqq.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmc3h5eG1idWVvc2dma3dmbnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDQyNDYsImV4cCI6MjA5NTk4MDI0Nn0.0zjZGnbdY-dPZReHXkeCyxO25rNoFKlxTVli7aKLxoU",
};

const supabaseClient =
  window.supabase?.createClient?.(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: { persistSession: false },
  }) || null;

let supabaseReady = false;

const keys = {
  customers: "somali-tailor-customers",
  measurements: "somali-tailor-measurements",
  notes: "somali-tailor-notes",
  orders: "somali-tailor-orders",
  invoices: "somali-tailor-invoices",
  settings: "somali-tailor-settings",
  selectedPayment: "somali-tailor-payment",
};

const defaultCustomers = [
  { name: "Ahmed Hassan", phone: "+252 61 555 1001", city: "Muqdisho", garment: "Suud Aroos", note: "" },
  { name: "Muna Farah", phone: "+252 61 555 1002", city: "Hargeysa", garment: "Dharka Habeenka", note: "" },
];

const defaultOrders = [
  { id: "ORD-8821", customer: "Ahmed Hassan", garment: "Khamiis gaar ah", fabric: "Linen Talyaani ah", status: "Cusub", due: "2 maalmood gudahood", amount: 450 },
  { id: "ORD-8825", customer: "Mariam Yusuf", garment: "Baati aroos", fabric: "Xariir qurxin leh", status: "Cusub", due: "24 Okt", amount: 620 },
  { id: "ORD-8812", customer: "Omar Farah", garment: "Macawiis qurux badan", fabric: "Cudbi tayo sare leh", status: "Jarid", due: "Berri", amount: 280 },
  { id: "ORD-8790", customer: "Zahra Warsame", garment: "Dirac dhammeystiran", fabric: "Chiffon ballaaran", status: "Tolid", due: "Hanna L.", amount: 850 },
];

const defaultInvoices = [
  { id: "INV-9821", customer: "Ahmed Hassan", date: "24 Okt 2023", amount: 450, status: "La bixiyay", items: [{ name: "Suud xariir Talyaani ah", qty: 1, price: 350 }, { name: "Shaati gacmo Faransiis ah", qty: 2, price: 50 }] },
  { id: "INV-9819", customer: "Muna Farah", date: "22 Okt 2023", amount: 1200, status: "Qeyb", items: [{ name: "Dharka Habeenka", qty: 1, price: 1200 }] },
  { id: "INV-9815", customer: "Jama Duale", date: "18 Okt 2023", amount: 850, status: "Daahay", items: [{ name: "Khamiis gaar ah", qty: 1, price: 850 }] },
];

const readStore = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};

const setSyncStatus = (message) => {
  if (syncStatus) syncStatus.textContent = message;
};

const syncStore = async (key, value) => {
  if (!supabaseClient) return false;

  const { error } = await supabaseClient.from("app_state").upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    supabaseReady = false;
    setSyncStatus("Supabase lama kaydin karo weli. Hubi in table-ka app_state iyo policies la sameeyay.");
    console.warn("Supabase sync failed:", error.message);
    return false;
  }

  supabaseReady = true;
  setSyncStatus("Supabase wuu xiran yahay. Xogta browser-ka iyo database-ka waa la wada keydinayaa.");
  return true;
};

const writeStore = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    syncStore(key, value);
    return true;
  } catch {
    syncStore(key, value);
    return false;
  }
};

let customers = readStore(keys.customers, defaultCustomers);
let measurements = readStore(keys.measurements, {});
let notes = readStore(keys.notes, []);
let orders = readStore(keys.orders, defaultOrders);
let invoices = readStore(keys.invoices, defaultInvoices);
let settings = readStore(keys.settings, {
  businessName: "Ganeey Tailor",
  businessPhone: "+252 61 XXX XXXX",
  businessCity: "Muqdisho",
  currency: "USD",
});

let selectedCustomer = customers[0];

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const initials = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const today = () => new Date().toLocaleDateString("so-SO", { day: "2-digit", month: "short", year: "numeric" });

const loadSupabaseState = async () => {
  if (!supabaseClient) {
    setSyncStatus("Supabase client lama helin. Xogta waxay ku kaydsan tahay browser-ka.");
    return;
  }

  const { data, error } = await supabaseClient.from("app_state").select("key,value");

  if (error) {
    supabaseReady = false;
    setSyncStatus("Supabase table weli lama diyaarin. Isticmaal supabase-schema.sql kadib refresh garee.");
    console.warn("Supabase load failed:", error.message);
    return;
  }

  const remote = Object.fromEntries((data || []).map((row) => [row.key, row.value]));
  customers = remote[keys.customers] || customers;
  measurements = remote[keys.measurements] || measurements;
  notes = remote[keys.notes] || notes;
  orders = remote[keys.orders] || orders;
  invoices = remote[keys.invoices] || invoices;
  settings = remote[keys.settings] || settings;
  selectedCustomer = customers[0];

  Object.entries(remote).forEach(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  });

  supabaseReady = true;
  setSyncStatus("Supabase wuu xiran yahay. Xogta database-ka ayaa la isticmaalayaa.");

  if (!data?.length) {
    syncAllState();
    setSyncStatus("Supabase wuu xiran yahay. Xogtii bilowga ahayd waa la diray.");
  }
};

const syncAllState = () => {
  writeStore(keys.customers, customers);
  writeStore(keys.measurements, measurements);
  writeStore(keys.notes, notes);
  writeStore(keys.orders, orders);
  writeStore(keys.invoices, invoices);
  writeStore(keys.settings, settings);
  writeStore(keys.selectedPayment, readStore(keys.selectedPayment, "Zaad Service"));
};

const openActionModal = (title, body, kicker = "Nidaam") => {
  actionModal.querySelector("[data-action-kicker]").textContent = kicker;
  actionModal.querySelector("[data-action-title]").textContent = title;
  actionModal.querySelector("[data-action-body]").textContent = body;
  actionModal.classList.add("is-open");
  actionModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
};

const closeActionModal = () => {
  actionModal.classList.remove("is-open");
  actionModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
};

const showView = (viewId) => {
  views.forEach((view) => view.classList.toggle("is-active", view.id === viewId));
  navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.viewTarget === viewId));
  sidebar.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const openCustomerModal = () => {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  formStatus.textContent = "";
  customerForm.elements.name.focus();
};

function closeCustomerModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

const renderCustomers = (query = "") => {
  const normalized = query.trim().toLowerCase();
  const visibleCustomers = customers.filter((customer) =>
    [customer.name, customer.phone, customer.city, customer.garment].some((value) =>
      String(value || "").toLowerCase().includes(normalized)
    )
  );

  customersTable.innerHTML = visibleCustomers.length
    ? visibleCustomers
        .map((customer) => {
          const index = customers.indexOf(customer);
          const name = escapeHtml(customer.name);
          const garment = escapeHtml(customer.garment || "Macmiil cusub");

          return `
            <tr>
              <td><span class="mini-avatar ${index % 2 ? "gold" : "navy"}">${initials(customer.name)}</span><div>${name}<small>${garment}</small></div></td>
              <td><mark class="${index % 2 ? "gray" : ""}">${index === 0 ? "Tolid" : "Cabbir"}</mark></td>
              <td>${measurements[customer.phone]?.date || "Maanta"}</td>
              <td><button class="table-action" data-select-customer="${index}">Cabbir</button></td>
            </tr>`;
        })
        .join("")
    : `<tr><td colspan="4">Natiijo lama helin.</td></tr>`;
};

const money = (amount) => `${settings.currency || "USD"} ${Number(amount || 0).toLocaleString()}`;

const renderStats = () => {
  document.querySelector("[data-stat-orders]").textContent = orders.length;
  document.querySelector("[data-stat-pending]").textContent = orders.filter((order) => order.status !== "Dhammaaday").length;
  document.querySelector("[data-stat-done]").textContent = orders.filter((order) => order.status === "Dhammaaday").length;
  document.querySelector("[data-stat-revenue]").textContent = money(invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0));
};

const renderProfile = () => {
  const customer = selectedCustomer || customers[0];
  if (!customer) return;

  document.querySelector("[data-profile-initials]").textContent = initials(customer.name);
  document.querySelector("[data-profile-name]").textContent = customer.name;
  document.querySelector("[data-profile-meta]").textContent = `${customer.city || "Muqdisho"}, Soomaaliya · ${customer.phone || "Telefoon lama hayo"}`;

  const saved = measurements[customer.phone]?.measures || {};
  const measureEntries = Object.entries(saved).slice(0, 8);
  profileMeasures.innerHTML = measureEntries.length
    ? measureEntries.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}<small>in</small></strong></div>`).join("")
    : `<div><span>Cabbir</span><strong>0<small>in</small></strong></div><div><span>Status</span><strong>New</strong></div>`;

  const customerNotes = notes.filter((note) => note.customer === customer.name).slice(0, 3);
  styleNotes.innerHTML = customerNotes.length
    ? customerNotes.map((note) => `<p>"${escapeHtml(note.note)}"</p>`).join("")
    : `<p>"Qoraallo gaar ah weli lama keydin."</p><p>"Ku dar qoraal si uu ugu xirmo macmiilkan."</p>`;

  const history = orders.filter((order) => order.customer === customer.name).slice(0, 4);
  orderHistory.innerHTML = history.length
    ? history
        .map(
          (order) =>
            `<div class="history-item"><span></span><div><strong>${escapeHtml(order.garment)}</strong><small>Dalab #${escapeHtml(order.id)} · ${escapeHtml(order.due)}</small></div><mark>${escapeHtml(order.status)}</mark><b>${money(order.amount)}</b></div>`
        )
        .join("")
    : `<div class="history-item"><span></span><div><strong>Dalab ma jiro</strong><small>Dalab cusub samee si uu halkan uga muuqdo</small></div><mark class="gray">Cusub</mark><b>${money(0)}</b></div>`;
};

const renderOrders = () => {
  const lanes = ["Cusub", "Jarid", "Tolid", "Dhammaaday"];
  ordersBoard.innerHTML = lanes
    .map((lane) => {
      const laneOrders = orders.filter((order) => order.status === lane);
      const cards = laneOrders.length
        ? laneOrders
            .map(
              (order) =>
                `<article class="order-card ${lane === "Jarid" ? "top-line" : ""}" data-order-id="${escapeHtml(order.id)}"><small>#${escapeHtml(order.id)}</small><h4>${escapeHtml(order.customer)}</h4><p>${escapeHtml(order.garment)} · ${escapeHtml(order.fabric || "Faahfaahin")}</p><footer><span class="mini-avatar navy">${initials(order.customer)}</span><b>${escapeHtml(order.due || "Maanta")}</b></footer></article>`
            )
            .join("")
        : `<article class="order-card"><small>${lane}</small><h4>Wax dalab ah ma jiro</h4><p>Dalab cusub ayaa halkan ka muuqan doona.</p></article>`;

      return `<div class="lane"><h3>${lane} <span>${laneOrders.length}</span></h3>${cards}</div>`;
    })
    .join("");
};

const renderInvoices = () => {
  if (!invoices.length) {
    recentInvoices.innerHTML = `<small>Biilal weli lama keydin.</small>`;
    invoiceTable.innerHTML = `<tr><td colspan="5">Biilal weli lama keydin.</td></tr>`;
    invoicePreview.innerHTML = `<h3>BIIL</h3><p>Biil cusub samee si preview-gu u muuqdo.</p>`;
    return;
  }

  recentInvoices.innerHTML = invoices
    .slice(0, 3)
    .map((invoice) => `<div class="invoice-row"><span></span><div><strong>#${escapeHtml(invoice.id)}</strong><small>${escapeHtml(invoice.customer)}</small></div><b>${money(invoice.amount)}</b><em>${escapeHtml(invoice.status)}</em></div>`)
    .join("");

  invoiceTable.innerHTML = invoices
    .map((invoice) => `<tr><td>#${escapeHtml(invoice.id)}</td><td>${escapeHtml(invoice.customer)}</td><td>${escapeHtml(invoice.date)}</td><td><b>${money(invoice.amount)}</b></td><td><mark>${escapeHtml(invoice.status)}</mark></td></tr>`)
    .join("");

  const invoice = invoices[0];
  const items = invoice.items || [{ name: "Adeeg harqaan", qty: 1, price: invoice.amount }];
  invoicePreview.innerHTML = `<h3>BIIL</h3><p>Tixraac: #${escapeHtml(invoice.id)}</p><div class="invoice-address"><strong>Waxaa lagu qoray:</strong><b>${escapeHtml(invoice.customer)}</b><span>${escapeHtml(settings.businessCity || "Muqdisho")}<br />${escapeHtml(settings.businessPhone || "")}</span></div><table><tbody>${items
    .map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.qty}</td><td>${money(item.price)}</td><td>${money(Number(item.qty || 1) * Number(item.price || 0))}</td></tr>`)
    .join("")}</tbody></table><footer><span>Wadar</span><strong>${money(invoice.amount)}</strong></footer>`;
};

const renderAll = () => {
  renderCustomers(searchInput.value);
  renderSavedMeasures();
  renderStats();
  renderProfile();
  renderOrders();
  renderInvoices();
};

const fillMeasurementForm = (customer) => {
  const saved = measurements[customer.phone] || {};
  document.querySelector('[data-field="date"]').value = saved.date || today();
  document.querySelector('[data-field="name"]').value = customer.name;
  document.querySelector('[data-field="phone"]').value = customer.phone;

  document.querySelectorAll("[data-field]").forEach((input) => {
    if (!["date", "name", "phone"].includes(input.dataset.field)) {
      input.value = saved.fields?.[input.dataset.field] || "";
    }
  });

  document.querySelectorAll("[data-measure]").forEach((input) => {
    input.value = saved.measures?.[input.dataset.measure] || "";
  });

  renderSavedMeasures(customer);
};

const selectCustomer = (customer) => {
  selectedCustomer = customer;
  currentCustomer.textContent = customer.name;
  measureBreadcrumb.textContent = `Macaamiil > ${customer.name}`;
  fillMeasurementForm(customer);
  renderProfile();
  showView("measurements");
};

const renderSavedMeasures = (customer = selectedCustomer) => {
  const saved = measurements[customer.phone];
  if (!saved?.measures || !Object.keys(saved.measures).length) {
    savedMeasures.innerHTML = "<small>Weli cabbir lama keydin.</small>";
    return;
  }

  savedMeasures.innerHTML = Object.entries(saved.measures)
    .map(([label, value]) => `<span>${escapeHtml(label)}: ${escapeHtml(value)}</span>`)
    .join("");
};

const saveMeasurements = () => {
  const customerName = document.querySelector('[data-field="name"]').value.trim();
  const customerPhone = document.querySelector('[data-field="phone"]').value.trim();

  if (!customerName || !customerPhone) {
    openActionModal("Cabbir lama keydin", "Fadlan geli magaca iyo telefoonka macmiilka.", "Cabbirro");
    return;
  }

  const fields = {};
  document.querySelectorAll("[data-field]").forEach((input) => {
    fields[input.dataset.field] = input.value.trim();
  });

  const measures = {};
  document.querySelectorAll("[data-measure]").forEach((input) => {
    if (input.value.trim()) measures[input.dataset.measure] = input.value.trim();
  });

  measurements[customerPhone] = { date: fields.date || today(), fields, measures };
  const existingCustomer = customers.find((customer) => customer.phone === customerPhone);
  if (existingCustomer) {
    existingCustomer.name = customerName;
    existingCustomer.city = fields.city || existingCustomer.city;
  } else {
    customers.unshift({ name: customerName, phone: customerPhone, city: settings.businessCity, garment: fields.details || "Macmiil cusub", note: "" });
    selectedCustomer = customers[0];
    writeStore(keys.customers, customers);
  }

  writeStore(keys.measurements, measurements);
  renderAll();
  openActionModal("Cabbirka waa la keydiyay", `${customerName} cabbirkiisa waa la keydiyay oo shaashadda waa la cusbooneysiiyay.`, "Cabbirro");
};

const downloadFile = (filename, content, type = "text/plain") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const exportReport = (filename = "ganeey-report.txt") => {
  const report = [
    `${settings.businessName} Report`,
    `Date: ${today()}`,
    `Customers: ${customers.length}`,
    `Saved measurements: ${Object.keys(measurements).length}`,
    `Payment method: ${readStore(keys.selectedPayment, "Zaad Service")}`,
  ].join("\n");

  downloadFile(filename, report);
  openActionModal("Warbixin waa la diyaariyay", "File-ka report-ka ayaa la soo dejiyay.", "Warbixin");
};

const createQuickOrder = () => {
  const customer = selectedCustomer || customers[0];
  const order = {
    id: `ORD-${Date.now().toString().slice(-5)}`,
    customer: customer?.name || "Macmiil cusub",
    garment: customer?.garment || "Dalab cusub",
    fabric: "Faahfaahin cusub",
    status: "Cusub",
    due: today(),
    amount: 0,
  };

  orders.unshift(order);
  writeStore(keys.orders, orders);
  renderAll();
  openActionModal("Dalab cusub", `Dalab #${order.id} waa la keydiyay.`, "Dalabyo");
  showView("orders");
};

const createInvoice = () => {
  const customer = selectedCustomer || customers[0];
  const invoice = {
    id: `INV-${Date.now().toString().slice(-5)}`,
    customer: customer?.name || "Macmiil cusub",
    date: today(),
    amount: 0,
    status: "Sugaya",
    items: [{ name: customer?.garment || "Adeeg harqaan", qty: 1, price: 0 }],
  };

  invoices.unshift(invoice);
  writeStore(keys.invoices, invoices);
  renderAll();
  openActionModal("Biil cusub", `Biil #${invoice.id} waa la keydiyay.`, "Biilal");
  showView("invoices");
};

const saveSettings = () => {
  document.querySelectorAll("[data-setting]").forEach((input) => {
  settings[input.dataset.setting] = input.value.trim();
  });
  writeStore(keys.settings, settings);
  renderAll();
  openActionModal("Dejinta waa la keydiyay", supabaseReady ? "Macluumaadka ganacsiga waxaa lagu kaydiyay Supabase." : "Macluumaadka ganacsiga waa la kaydiyay browser-ka. Supabase table-ka hubi.", "Dejin");
};

const addNote = () => {
  const note = prompt("Ku qor qoraalka macmiilka:");
  if (!note?.trim()) return;
  notes.unshift({ customer: selectedCustomer?.name || "Macmiil", note: note.trim(), date: today() });
  writeStore(keys.notes, notes);
  renderAll();
  openActionModal("Qoraal waa la keydiyay", "Qoraalka cusub waa la kaydiyay oo profile-ka ayuu ka muuqdaa.", "Qoraal");
};

const wireActions = () => {
  navItems.forEach((item) => item.addEventListener("click", () => showView(item.dataset.viewTarget)));
  document.querySelectorAll("[data-open-customer]").forEach((button) => button.addEventListener("click", openCustomerModal));
  document.querySelectorAll("[data-close-customer]").forEach((button) => button.addEventListener("click", closeCustomerModal));
  document.querySelectorAll("[data-close-action]").forEach((button) => button.addEventListener("click", closeActionModal));

  menuToggle.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      sidebar.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      closeCustomerModal();
      closeActionModal();
    }
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeCustomerModal();
  });

  actionModal.addEventListener("click", (event) => {
    if (event.target === actionModal) closeActionModal();
  });

  customerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(customerForm);
    const customer = {
      name: String(form.get("name") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      city: String(form.get("city") || "").trim(),
      garment: String(form.get("garment") || "").trim(),
      note: String(form.get("note") || "").trim(),
    };

    if (!customer.name || !customer.phone) {
      formStatus.textContent = "Fadlan geli magaca iyo telefoonka.";
      return;
    }

    customers.unshift(customer);
    selectedCustomer = customer;
    writeStore(keys.customers, customers);
    renderAll();
    customerForm.reset();
    closeCustomerModal();
    selectCustomer(customer);
  });

  customersTable.addEventListener("click", (event) => {
    const button = event.target.closest("[data-select-customer]");
    if (!button) return;
    selectCustomer(customers[Number(button.dataset.selectCustomer)]);
  });

  searchInput.addEventListener("input", () => renderCustomers(searchInput.value));
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") showView("dashboard");
  });

  document.querySelector("[data-save-measurements]").addEventListener("click", saveMeasurements);
  document.querySelector("[data-clear-measurements]").addEventListener("click", () => {
    document.querySelectorAll("[data-measure], [data-field]").forEach((input) => {
      input.value = "";
    });
    savedMeasures.innerHTML = "<small>Foomka waa la nadiifiyay.</small>";
  });

  ordersBoard.addEventListener("click", (event) => {
    const card = event.target.closest(".order-card");
    if (!card) return;
    const order = orders.find((item) => item.id === card.dataset.orderId);
    openActionModal("Faahfaahinta dalabka", order ? `${order.customer}: ${order.garment}, ${order.status}, ${money(order.amount)}.` : "Faahfaahinta dalabkan waa la furay.", "Dalab");
  });

  orderHistory.addEventListener("click", (event) => {
    if (!event.target.closest(".history-item")) return;
    showView("orders");
  });

  document.querySelectorAll("[data-new-order]").forEach((button) => button.addEventListener("click", createQuickOrder));
  document.querySelector("[data-new-invoice]").addEventListener("click", createInvoice);
  document.querySelector("[data-export-report]").addEventListener("click", () => exportReport("ganeey-dashboard-report.txt"));
  document.querySelector("[data-export-orders]").addEventListener("click", () => exportReport("ganeey-orders-report.txt"));
  document.querySelector("[data-export-invoice]").addEventListener("click", () => exportReport("ganeey-invoice.txt"));
  document.querySelector("[data-print-invoice]").addEventListener("click", () => window.print());
  document.querySelector("[data-email-invoice]").addEventListener("click", () => openActionModal("Iimayl PDF", "PDF email preview waa diyaar. Email dirista dhabta ah waxay u baahan doontaa Supabase ama adeeg email.", "Biilal"));
  document.querySelector("[data-whatsapp-invoice]").addEventListener("click", () => window.open("https://wa.me/?text=Biilka%20Ganeey%20Tailor%20waa%20diyaar.", "_blank"));
  document.querySelector("[data-whatsapp-update]").addEventListener("click", () => window.open("https://wa.me/?text=Dalabkaaga%20Ganeey%20Tailor%20wuu%20socdaa.", "_blank"));
  document.querySelector("[data-add-note]").addEventListener("click", addNote);
  document.querySelector("[data-edit-profile-measures]").addEventListener("click", () => selectCustomer(selectedCustomer || customers[0]));
  document.querySelector("[data-show-customers]").addEventListener("click", (event) => {
    event.preventDefault();
    showView("customers");
  });
  document.querySelector("[data-show-orders]").addEventListener("click", (event) => {
    event.preventDefault();
    showView("orders");
  });
  document.querySelector("[data-show-invoices]").addEventListener("click", () => showView("invoices"));
  document.querySelector("[data-filter-orders]").addEventListener("click", () => openActionModal("Shaandheynta", "Dalabyada muhiimka ah iyo kuwa maanta ku eg ayaa la muujiyay.", "Dalabyo"));
  document.querySelector("[data-save-settings]").addEventListener("click", saveSettings);
  document.querySelector("[data-system-status]").addEventListener("click", () =>
    openActionModal(
      "Xaaladda Nidaamka",
      supabaseReady
        ? "Supabase wuu shaqeynayaa. Customers, measurements, notes, settings, iyo payment method waa la sync gareynayaa."
        : "Local save wuu shaqeynayaa. Supabase wuxuu u baahan yahay table-ka app_state iyo policies.",
      "Status"
    )
  );
  document.querySelector("[data-cycle-period]").addEventListener("click", (event) => {
    const periods = ["Bishan", "Toddobaadkan", "Sannadkan"];
    const next = periods[(periods.indexOf(event.currentTarget.textContent) + 1) % periods.length];
    event.currentTarget.textContent = next;
  });

  document.querySelectorAll(".tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach((tab) => tab.classList.remove("is-active"));
      button.classList.add("is-active");
      openActionModal("Falanqeyn", `${button.textContent} ayaa la doortay.`, "Analytics");
    });
  });

  document.querySelectorAll(".pay-method").forEach((method) => {
    method.addEventListener("click", () => {
      document.querySelectorAll(".pay-method").forEach((item) => item.classList.remove("active"));
      method.classList.add("active");
      writeStore(keys.selectedPayment, method.dataset.payMethod);
      renderStats();
      openActionModal("Habka lacagta", `${method.dataset.payMethod} ayaa la doortay.`, "Lacag-bixin");
    });
  });

  document.querySelectorAll(".sidebar-bottom a").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openActionModal(link.textContent, "Local app-ka wuu shaqeynayaa, xogtuna browser-ka ayay ku kaydsan tahay.", "Caawimo");
    });
  });

  document.querySelectorAll('a[href="#"]:not([data-show-customers]):not([data-show-orders])').forEach((link) => {
    if (link.closest(".sidebar-bottom")) return;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openActionModal(link.textContent || "Warbixin", "Faahfaahinta qaybtan waa diyaar. Xogta dhabta ah waxay ku xirnaan doontaa Supabase.", "Nidaam");
    });
  });

  document.querySelectorAll(".ghost-icon").forEach((button) => {
    button.addEventListener("click", () => openActionModal(button.ariaLabel || "Ogeysiis", "Wax cusub lama hayo hadda.", "Ogeysiis"));
  });
};

const init = async () => {
  await loadSupabaseState();

  document.querySelectorAll("[data-setting]").forEach((input) => {
    input.value = settings[input.dataset.setting] || input.value;
  });

  const selectedPayment = readStore(keys.selectedPayment, "Zaad Service");
  document.querySelectorAll(".pay-method").forEach((method) => {
    method.classList.toggle("active", method.dataset.payMethod === selectedPayment);
  });

  renderAll();
  wireActions();
};

init();
