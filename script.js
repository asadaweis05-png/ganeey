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

const keys = {
  customers: "somali-tailor-customers",
  measurements: "somali-tailor-measurements",
  notes: "somali-tailor-notes",
  settings: "somali-tailor-settings",
  selectedPayment: "somali-tailor-payment",
};

const defaultCustomers = [
  { name: "Ahmed Hassan", phone: "+252 61 555 1001", city: "Muqdisho", garment: "Suud Aroos", note: "" },
  { name: "Muna Farah", phone: "+252 61 555 1002", city: "Hargeysa", garment: "Dharka Habeenka", note: "" },
];

const readStore = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};

const writeStore = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const customers = readStore(keys.customers, defaultCustomers);
const measurements = readStore(keys.measurements, {});
const notes = readStore(keys.notes, []);
const settings = readStore(keys.settings, {
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
  writeStore(keys.measurements, measurements);
  renderSavedMeasures({ phone: customerPhone });
  renderCustomers(searchInput.value);
  openActionModal("Cabbirka waa la keydiyay", `${customerName} cabbirkiisa wuxuu ku kaydsan yahay browser-ka.`, "Cabbirro");
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
  openActionModal("Dalab cusub", "Dalab cusub ayaa diyaar u ah in lala xiriiriyo macmiilka hadda. Supabase ka dib wuxuu noqon doonaa record rasmi ah.", "Dalabyo");
  showView("orders");
};

const createInvoice = () => {
  openActionModal("Biil cusub", "Biil cusub ayaa la diyaariyay. Hadda wuxuu ku shaqeynayaa preview; Supabase kadib waa la kaydin doonaa.", "Biilal");
  showView("invoices");
};

const saveSettings = () => {
  document.querySelectorAll("[data-setting]").forEach((input) => {
    settings[input.dataset.setting] = input.value.trim();
  });
  writeStore(keys.settings, settings);
  openActionModal("Dejinta waa la keydiyay", "Macluumaadka ganacsiga waa la kaydiyay.", "Dejin");
};

const addNote = () => {
  const note = prompt("Ku qor qoraalka macmiilka:");
  if (!note?.trim()) return;
  notes.unshift({ customer: selectedCustomer?.name || "Macmiil", note: note.trim(), date: today() });
  writeStore(keys.notes, notes);
  openActionModal("Qoraal waa la keydiyay", "Qoraalka cusub waa la kaydiyay browser-ka.", "Qoraal");
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
    writeStore(keys.customers, customers);
    renderCustomers(searchInput.value);
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
  document.querySelector("[data-system-status]").addEventListener("click", () => openActionModal("Xaaladda Nidaamka", "Local save wuu shaqeynayaa. Supabase weli lama xirin.", "Status"));
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
      openActionModal("Habka lacagta", `${method.dataset.payMethod} ayaa la doortay.`, "Lacag-bixin");
    });
  });

  document.querySelectorAll(".order-card, .history-item").forEach((card) => {
    card.addEventListener("click", () => openActionModal("Faahfaahinta dalabka", "Faahfaahinta dalabkan waa la furay. Kaydin buuxda waxay imaaneysaa marka Supabase la xiro.", "Dalab"));
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

const init = () => {
  document.querySelectorAll("[data-setting]").forEach((input) => {
    input.value = settings[input.dataset.setting] || input.value;
  });

  const selectedPayment = readStore(keys.selectedPayment, "Zaad Service");
  document.querySelectorAll(".pay-method").forEach((method) => {
    method.classList.toggle("active", method.dataset.payMethod === selectedPayment);
  });

  renderCustomers();
  renderSavedMeasures();
  wireActions();
};

init();
