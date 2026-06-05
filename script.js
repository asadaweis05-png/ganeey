const navItems = document.querySelectorAll("[data-view-target]");
const views = document.querySelectorAll(".view");
const sidebar = document.querySelector("[data-sidebar]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const modal = document.querySelector("[data-customer-modal]");
const customerForm = document.querySelector("[data-customer-form]");
const customersTable = document.querySelector("[data-customers-table]");
const formStatus = document.querySelector("[data-form-status]");
const currentCustomer = document.querySelector("[data-current-customer]");
const measureBreadcrumb = document.querySelector("[data-measure-breadcrumb]");
const savedMeasures = document.querySelector("[data-saved-measures]");
const authStatus = document.querySelector("[data-auth-status]");
const userPill = document.querySelector("[data-user-pill]");
const syncStatus = document.querySelector("[data-sync-status]");
const customerDirectory = document.querySelector("[data-customer-directory]");
const profileInitials = document.querySelector("[data-profile-initials]");
const profileName = document.querySelector("[data-profile-name]");
const profileMeta = document.querySelector("[data-profile-meta]");
const profileMeasures = document.querySelector("[data-profile-measures]");
const profileMeasureDate = document.querySelector("[data-profile-measure-date]");
const searchInput = document.querySelector("[data-global-search]");
const searchResults = document.querySelector("[data-search-results]");
const haraaList = document.querySelector("[data-haraa-list]");
const haraaTotal = document.querySelector("[data-haraa-total]");
const profileModal = document.querySelector("[data-profile-modal]");
const profileForm = document.querySelector("[data-profile-form]");
const profileStatus = document.querySelector("[data-profile-status]");
const themeToggle = document.querySelector("[data-theme-toggle]");
const imagePreviews = document.querySelector("[data-image-previews]");
const modalImagePreviews = document.querySelector("[data-modal-image-previews]");
const moneyElements = {
  customers: document.querySelector("[data-stat-customers]"),
  balance: document.querySelector("[data-stat-balance]"),
  paidCustomers: document.querySelector("[data-stat-paid-customers]"),
  income: document.querySelector("[data-stat-income]"),
  analyticsIncome: document.querySelector("[data-analytics-income]"),
  analyticsBalance: document.querySelector("[data-analytics-balance]"),
  analyticsProgress: document.querySelector("[data-analytics-progress]"),
  analyticsRate: document.querySelector("[data-analytics-rate]"),
  analyticsAverage: document.querySelector("[data-analytics-average]"),
  analyticsPaidCount: document.querySelector("[data-analytics-paid-count]"),
  categoryTotal: document.querySelector("[data-category-total]"),
  categoryPaid: document.querySelector("[data-category-paid]"),
  categoryBalance: document.querySelector("[data-category-balance]"),
  billingPaid: document.querySelector("[data-billing-paid]"),
  billingBalance: document.querySelector("[data-billing-balance]"),
  billingTotal: document.querySelector("[data-billing-total]"),
  billingSummary: document.querySelector("[data-billing-summary]"),
};

const supabaseConfig = {
  url: "https://tfsxyxmbueosgfkwfnqq.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmc3h5eG1idWVvc2dma3dmbnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDQyNDYsImV4cCI6MjA5NTk4MDI0Nn0.0zjZGnbdY-dPZReHXkeCyxO25rNoFKlxTVli7aKLxoU",
};

const keys = {
  customers: "tailor-system-customers",
  measurements: "tailor-system-measurements",
  session: "tailor-system-supabase-session",
  profile: "tailor-system-profile",
  theme: "tailor-system-theme",
};

const defaultCustomers = [];

let customers = [];
let measurements = {};
let selectedCustomer = null;
let currentUser = null;
let supabaseReady = false;
let profileSettings = {};
let modalImages = {};

const fakeCustomerNames = new Set(["Ahmed Hassan", "Muna Farah"]);

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

profileSettings = readJson(keys.profile, {});

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const supabaseRequest = async (path, options = {}) => {
  const session = readJson(keys.session, null);
  const headers = {
    apikey: supabaseConfig.anonKey,
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${supabaseConfig.url}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.msg || payload?.message || payload?.error_description || payload?.hint || "Supabase request failed.");
  }

  return payload;
};

const saveSession = (payload) => {
  if (!payload?.access_token || !payload?.user) return null;

  const session = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: payload.expires_at,
    user: payload.user,
  };
  writeJson(keys.session, session);
  return session;
};

const supabaseAuth = {
  signUp: async ({ email, password, name }) =>
    supabaseRequest("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, data: { name } }),
    }),
  signInWithPassword: async ({ email, password }) =>
    supabaseRequest("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  getSession: async () => {
    const session = readJson(keys.session, null);
    if (!session?.access_token) return null;

    try {
      const user = await supabaseRequest("/auth/v1/user", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      return { ...session, user };
    } catch {
      localStorage.removeItem(keys.session);
      return null;
    }
  },
  signOut: async () => {
    const session = readJson(keys.session, null);
    if (session?.access_token) {
      try {
        await supabaseRequest("/auth/v1/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      } catch {
        // Local sign-out should still happen even if the network is unavailable.
      }
    }
    localStorage.removeItem(keys.session);
  },
};

const setAuthStatus = (message, type = "") => {
  if (!authStatus) return;
  authStatus.textContent = message;
  authStatus.dataset.type = type;
};

const setSyncStatus = (message, type = "") => {
  if (!syncStatus) return;
  syncStatus.textContent = message;
  syncStatus.dataset.type = type;
};

const userNameFrom = (user) => user?.user_metadata?.name || user?.email || "User";

const showAppForUser = async (user) => {
  currentUser = user;
  document.body.classList.add("is-authenticated");
  if (userPill) userPill.textContent = profileSettings.name || userNameFrom(user);
  setAuthStatus("");
  await loadSupabaseState();
};

const showAuthScreen = () => {
  currentUser = null;
  document.body.classList.remove("is-authenticated");
  setAuthStatus("");
  setSyncStatus("Sign in to sync with Supabase.", "warning");
};

const syncStore = async (key, value) => {
  writeJson(key, value);

  if (!currentUser?.id) {
    supabaseReady = false;
    setSyncStatus("Supabase is not connected. Data is only cached on this browser.", "error");
    return false;
  }

  try {
    await supabaseRequest("/rest/v1/tailor_app_state", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        owner_id: currentUser.id,
        key,
        value,
        updated_at: new Date().toISOString(),
      }),
    });
  } catch (error) {
    supabaseReady = false;
    setSyncStatus("Supabase save failed. Run supabase-schema.sql and check RLS policies.", "error");
    console.warn("Supabase save failed:", error.message);
    return false;
  }

  supabaseReady = true;
  setSyncStatus("All changes are saved in Supabase.", "ok");
  return true;
};

const syncAllState = async () => {
  await syncStore(keys.customers, customers);
  await syncStore(keys.measurements, measurements);
  await syncStore(keys.profile, profileSettings);
};

const loadSupabaseState = async () => {
  customers = sanitizeCustomers(readJson(keys.customers, defaultCustomers));
  measurements = readJson(keys.measurements, {});
  profileSettings = readJson(keys.profile, {});

  if (!currentUser?.id) {
    supabaseReady = false;
    setSyncStatus("Supabase is not connected. Data is only cached on this browser.", "error");
    renderAll();
    return;
  }

  setSyncStatus("Loading data from Supabase...");
  let data = [];
  try {
    data = await supabaseRequest(`/rest/v1/tailor_app_state?select=key,value&owner_id=eq.${currentUser.id}`, {
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    supabaseReady = false;
    setSyncStatus("Supabase table is missing or blocked. Run the updated supabase-schema.sql.", "error");
    console.warn("Supabase load failed:", error.message);
    renderAll();
    return;
  }

  const remote = Object.fromEntries((data || []).map((row) => [row.key, row.value]));
  customers = sanitizeCustomers(remote[keys.customers] || customers);
  measurements = remote[keys.measurements] || measurements;
  profileSettings = remote[keys.profile] || profileSettings;
  writeJson(keys.customers, customers);
  writeJson(keys.measurements, measurements);
  writeJson(keys.profile, profileSettings);
  supabaseReady = true;

  if (!data?.length) {
    await syncAllState();
  } else {
    setSyncStatus("Data loaded from Supabase.", "ok");
  }

  renderAll();
};

const signUp = async (name, email, password) => {
  const cleanName = String(name || "").trim();
  const cleanEmail = normalizeEmail(email);

  if (!cleanName || !cleanEmail || password.length < 6) {
    setAuthStatus("Fadlan geli magaca, email sax ah, iyo password 6 xaraf ka badan.", "error");
    return;
  }

  setAuthStatus("Creating account in Supabase...");
  let data = null;
  try {
    data = await supabaseAuth.signUp({ email: cleanEmail, password, name: cleanName });
  } catch (error) {
    setAuthStatus(error.message, "error");
    return;
  }

  const session = saveSession(data);
  if (session?.user) {
    await showAppForUser(session.user);
    return;
  }

  setAuthStatus("Account created. If email confirmation is enabled, confirm the email then sign in.", "ok");
};

const signIn = async (email, password) => {
  const cleanEmail = normalizeEmail(email);

  setAuthStatus("Signing in with Supabase...");
  let data = null;
  try {
    data = await supabaseAuth.signInWithPassword({ email: cleanEmail, password });
  } catch (error) {
    setAuthStatus(error.message || "Sign in failed.", "error");
    return;
  }

  const session = saveSession(data);
  if (!session?.user) {
    setAuthStatus("Sign in failed. Supabase did not return a valid session.", "error");
    return;
  }

  await showAppForUser(session.user);
};

const signOut = async () => {
  await supabaseAuth.signOut();
  showAuthScreen();
};

const initAuth = async () => {
  const session = await supabaseAuth.getSession();
  if (session?.user) {
    await showAppForUser(session.user);
    return;
  }

  showAuthScreen();
};

const showView = (viewId) => {
  views.forEach((view) => view.classList.toggle("is-active", view.id === viewId));
  navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.viewTarget === viewId));
  sidebar.classList.remove("is-open");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const initials = (name) =>
  String(name || "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const sanitizeCustomers = (items) =>
  (Array.isArray(items) ? items : []).filter(
    (customer) => customer?.name && !String(customer.id || "").startsWith("sample-") && !fakeCustomerNames.has(customer.name)
  );

const formatDateTime = (value) => {
  if (!value) return "Weli lama cusbooneysiin";
  return new Date(value).toLocaleDateString("so-SO", { day: "2-digit", month: "short", year: "numeric" });
};

const parseMoney = (value) => {
  const normalized = String(value || "")
    .replace(/,/g, "")
    .match(/-?\d+(\.\d+)?/);
  return normalized ? Number(normalized[0]) : 0;
};

const formatMoney = (value) => `$${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const getCustomerPayment = (customer) => {
  const record = measurements[customer.id];
  const fields = record?.fields || {};
  return {
    paid: parseMoney(fields.bixiyey || customer.bixiyey),
    balance: parseMoney(fields.haraa || customer.haraa),
  };
};

const getFinancialSummary = () => {
  const rows = customers.map((customer) => ({ customer, ...getCustomerPayment(customer) }));
  const paid = rows.reduce((total, row) => total + row.paid, 0);
  const balance = rows.reduce((total, row) => total + row.balance, 0);
  const total = paid + balance;
  const paidCustomers = rows.filter((row) => row.paid > 0).length;
  const balanceCustomers = rows.filter((row) => row.balance > 0).length;
  return {
    rows,
    paid,
    balance,
    total,
    paidCustomers,
    balanceCustomers,
    paidRate: total ? Math.round((paid / total) * 100) : 0,
    average: rows.length ? paid / rows.length : 0,
  };
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const renderImagePreviews = (images = {}, target = imagePreviews) => {
  if (!target) return;
  target.innerHTML = ["upper", "lower"]
    .map((slot) => {
      const label = slot === "upper" ? "Sare" : "Hoose";
      return `<div class="image-preview">${images[slot] ? `<img src="${images[slot]}" alt="${label}" />` : `<small>${label} image</small>`}</div>`;
    })
    .join("");
};

const applyTheme = (theme = readJson(keys.theme, "light")) => {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-mode", isDark);
  if (themeToggle) themeToggle.textContent = isDark ? "Light" : "Dark";
  writeJson(keys.theme, theme);
};

const renderSearchResults = (query) => {
  if (!searchResults) return;
  const term = String(query || "").trim().toLowerCase();
  if (!term) {
    searchResults.classList.remove("is-open");
    searchResults.innerHTML = "";
    return;
  }

  const matches = customers.filter((customer) =>
    [customer.name, customer.phone, customer.city, customer.garment].some((value) => String(value || "").toLowerCase().includes(term))
  );

  searchResults.innerHTML = matches.length
    ? matches
        .map((customer) => {
          const index = customers.findIndex((item) => item.id === customer.id);
          const payment = getCustomerPayment(customer);
          return `<button type="button" data-search-customer="${index}"><span><strong>${escapeHtml(customer.name)}</strong><small>${escapeHtml(customer.phone || "")} · ${escapeHtml(customer.garment || "")}</small></span><b>${formatMoney(payment.balance)}</b></button>`;
        })
        .join("")
    : '<div class="empty-state">Macmiil lama helin.</div>';
  searchResults.classList.add("is-open");
};

const openProfileModal = () => {
  if (!profileModal || !profileForm) return;
  profileModal.classList.add("is-open");
  profileModal.setAttribute("aria-hidden", "false");
  profileForm.elements.name.value = profileSettings.name || currentUser?.user_metadata?.name || "";
  profileForm.elements.email.value = currentUser?.email || "";
  profileForm.elements.password.value = "";
  profileForm.elements.twofaPhone.value = profileSettings.twofaPhone || "";
  profileForm.elements.twofaEnabled.checked = Boolean(profileSettings.twofaEnabled);
};

const closeProfileModal = () => {
  if (!profileModal) return;
  profileModal.classList.remove("is-open");
  profileModal.setAttribute("aria-hidden", "true");
};

const renderHaraaList = () => {
  if (!haraaList) return;
  const rows = getFinancialSummary().rows.filter((row) => row.balance > 0);
  const total = rows.reduce((sum, row) => sum + row.balance, 0);
  if (haraaTotal) haraaTotal.textContent = formatMoney(total);
  haraaList.innerHTML = rows.length
    ? rows
        .map((row) => {
          const index = customers.findIndex((customer) => customer.id === row.customer.id);
          return `<button class="haraa-row" type="button" data-profile-customer="${index}"><span><strong>${escapeHtml(row.customer.name)}</strong><small>${escapeHtml(row.customer.phone || "Telefoon lama gelin")}</small></span><b>${formatMoney(row.balance)}</b></button>`;
        })
        .join("")
    : '<div class="empty-state">Hadda macmiil haraa leh ma jiro.</div>';
};

const openCustomerModal = () => {
  modalImages = {};
  renderImagePreviews(modalImages, modalImagePreviews);
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  customerForm.elements.name.focus();
};

function closeCustomerModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

const fillMeasurementForm = (customer) => {
  const record = customer ? measurements[customer.id] : null;
  const fields = record?.fields || {};
  document.querySelectorAll("[data-field]").forEach((input) => {
    input.value = fields[input.dataset.field] || "";
  });
  document.querySelectorAll("[data-measure]").forEach((input) => {
    input.value = record?.values?.[input.dataset.measure] || "";
  });
  renderImagePreviews(record?.images || {});

  if (!customer) return;
  document.querySelector('[data-field="name"]').value = fields.name || customer.name || "";
  document.querySelector('[data-field="phone"]').value = fields.phone || customer.phone || "";
  document.querySelector('[data-field="bixiyey"]').value = fields.bixiyey || customer.bixiyey || "";
  document.querySelector('[data-field="haraa"]').value = fields.haraa || customer.haraa || "";
};

const selectCustomer = (customer) => {
  selectedCustomer = customer;
  currentCustomer.textContent = customer.name;
  measureBreadcrumb.textContent = `Macaamiil > ${customer.name}`;
  fillMeasurementForm(customer);
  renderProfile();
  renderSavedMeasurements();
  showView("measurements");
};

const selectCustomerProfile = (customer) => {
  selectedCustomer = customer;
  fillMeasurementForm(customer);
  currentCustomer.textContent = customer.name;
  measureBreadcrumb.textContent = `Macaamiil > ${customer.name}`;
  renderAll();
  showView("customers");
};

const renderCustomers = () => {
  if (!customers.length) {
    customersTable.innerHTML = `
      <tr>
        <td colspan="4"><div class="empty-state">Weli macmiil lama gelin. Ku dar macmiilka koowaad si xog dhab ah uga muuqato nidaamka.</div></td>
      </tr>`;
    return;
  }

  customersTable.innerHTML = customers
    .map(
      (customer, index) => {
        const payment = getCustomerPayment(customer);
        const status = payment.balance > 0 ? "Haraa" : payment.paid > 0 ? "Bixiyay" : "Sugaya";
        return `
        <tr>
          <td><span class="mini-avatar ${index % 2 ? "gold" : "navy"}">${initials(customer.name)}</span><div>${escapeHtml(customer.name)}<small>${escapeHtml(customer.garment || "Macmiil cusub")}</small></div></td>
          <td><mark class="${payment.balance > 0 ? "red" : payment.paid > 0 ? "" : "gray"}">${status}</mark></td>
          <td>${formatMoney(payment.paid)} / ${formatMoney(payment.balance)}</td>
          <td><button class="table-action" data-select-customer="${index}">Cabbir</button></td>
        </tr>`;
      }
    )
    .join("");
};

const renderCustomerDirectory = () => {
  if (!customerDirectory) return;

  if (!customers.length) {
    customerDirectory.innerHTML = '<div class="empty-state">Weli macmiil lama gelin. Macmiil cusub ku dar si uu halkan uga muuqdo.</div>';
    return;
  }

  customerDirectory.innerHTML = `
    <div class="customer-directory">
      ${customers
        .map(
          (customer, index) => `
            <button class="customer-row ${selectedCustomer?.id === customer.id ? "is-active" : ""}" type="button" data-profile-customer="${index}">
              <span class="mini-avatar ${index % 2 ? "gold" : "navy"}">${initials(customer.name)}</span>
              <span><strong>${escapeHtml(customer.name)}</strong><small>${escapeHtml(customer.phone || "Telefoon lama gelin")} · ${escapeHtml(customer.city || "Magaalo lama gelin")}</small></span>
              <em>${formatMoney(getCustomerPayment(customer).paid)} bixiyey · ${formatMoney(getCustomerPayment(customer).balance)} haraa</em>
            </button>`
        )
        .join("")}
    </div>`;
};

const renderProfile = () => {
  const customer = selectedCustomer;
  const record = customer ? measurements[customer.id] : null;
  const values = record?.values || {};
  const measureAliases = {
    Laab: ["Laab", "Sare B"],
    Garbaha: ["Garbaha", "Sare S"],
    Dhex: ["Dhex", "Hoose B"],
    Dherer: ["Dherer", "Sare L"],
    Gacan: ["Gacan", "Sare G"],
    Qoorta: ["Qoorta", "Sare K"],
    Miskaha: ["Miskaha", "Hoose K"],
    Bawdo: ["Bawdo", "Hoose C"],
  };

  if (!customer) {
    if (profileInitials) profileInitials.textContent = "Sawir";
    if (profileName) profileName.textContent = "Macmiil lama dooran";
    if (profileMeta) profileMeta.textContent = "Ku dar macmiil si xog dhab ah uga muuqato halkan.";
    if (profileMeasureDate) profileMeasureDate.textContent = "Weli lama cusbooneysiin";
    if (profileMeasures) {
      profileMeasures.innerHTML = Object.keys(measureAliases)
        .map((label) => `<div><span>${label}</span><strong>0<small>in</small></strong></div>`)
        .join("");
    }
    return;
  }

  if (profileInitials) profileInitials.textContent = initials(customer.name);
  if (profileName) profileName.textContent = customer.name;
  if (profileMeta) profileMeta.textContent = `${customer.city || "Magaalo lama gelin"} · ${customer.phone || "Telefoon lama gelin"}`;
  const payment = getCustomerPayment(customer);
  if (profileMeta) profileMeta.textContent = `${customer.city || "Magaalo lama gelin"} · ${customer.phone || "Telefoon lama gelin"} · Bixiyey ${formatMoney(payment.paid)} · Haraa ${formatMoney(payment.balance)}`;
  if (profileMeasureDate) profileMeasureDate.textContent = record?.updatedAt ? `La cusbooneysiiyay: ${formatDateTime(record.updatedAt)}` : "Weli lama cusbooneysiin";
  if (profileMeasures) {
    profileMeasures.innerHTML = Object.entries(measureAliases)
      .map(([label, aliases]) => {
        const value = aliases.map((name) => values[name]).find(Boolean) || "0";
        return `<div><span>${label}</span><strong>${escapeHtml(value)}<small>in</small></strong></div>`;
      })
      .join("");
  }
};

const collectMeasurementRecord = () => {
  const fields = Object.fromEntries(
    [...document.querySelectorAll("[data-field]")].map((input) => [input.dataset.field, input.value.trim()])
  );
  const values = Object.fromEntries(
    [...document.querySelectorAll("[data-measure]")]
      .filter((input) => input.value.trim())
      .map((input) => [input.dataset.measure, input.value.trim()])
  );

  return {
    customerId: selectedCustomer?.id || fields.name || "unknown",
    customerName: fields.name || selectedCustomer?.name || "Macmiil",
    fields,
    values,
    images: measurements[selectedCustomer?.id]?.images || {},
    updatedAt: new Date().toISOString(),
  };
};

const collectModalMeasurementRecord = (customer) => {
  const fields = Object.fromEntries(
    [...customerForm.querySelectorAll("[data-modal-field]")]
      .filter((input) => input.value.trim())
      .map((input) => [input.dataset.modalField, input.value.trim()])
  );
  const values = Object.fromEntries(
    [...customerForm.querySelectorAll("[data-modal-measure]")]
      .filter((input) => input.value.trim())
      .map((input) => [input.dataset.modalMeasure, input.value.trim()])
  );

  fields.name = customer.name;
  fields.phone = customer.phone;
  fields.bixiyey = fields.bixiyey || customer.bixiyey || "";
  fields.haraa = fields.haraa || customer.haraa || "";

  return {
    customerId: customer.id,
    customerName: customer.name,
    fields,
    values,
    images: { ...modalImages },
    updatedAt: new Date().toISOString(),
  };
};

const renderSavedMeasurements = () => {
  const record = selectedCustomer ? measurements[selectedCustomer.id] : null;
  if (!record?.values || !Object.keys(record.values).length) {
    const payment = selectedCustomer ? getCustomerPayment(selectedCustomer) : { paid: 0, balance: 0 };
    savedMeasures.innerHTML = `<small>Weli cabbir lama gelin. Bixiyey: ${formatMoney(payment.paid)} · Haraa: ${formatMoney(payment.balance)}</small>`;
    return;
  }

  const paymentSummary = `<span>Bixiyey: ${formatMoney(parseMoney(record.fields?.bixiyey || selectedCustomer?.bixiyey))}</span><span>Haraa: ${formatMoney(parseMoney(record.fields?.haraa || selectedCustomer?.haraa))}</span>`;
  savedMeasures.innerHTML = paymentSummary + Object.entries(record.values)
    .map(([label, value]) => `<span>${escapeHtml(label)}: ${escapeHtml(value)}</span>`)
    .join("");
};

const renderFinancials = () => {
  const summary = getFinancialSummary();
  const paidPercent = `${summary.paidRate}%`;
  const balancePercent = `${summary.total ? 100 - summary.paidRate : 0}%`;

  if (moneyElements.customers) moneyElements.customers.textContent = String(customers.length);
  if (moneyElements.balance) moneyElements.balance.textContent = formatMoney(summary.balance);
  if (moneyElements.paidCustomers) moneyElements.paidCustomers.textContent = String(summary.paidCustomers);
  if (moneyElements.income) moneyElements.income.textContent = formatMoney(summary.paid);
  if (moneyElements.analyticsIncome) moneyElements.analyticsIncome.textContent = formatMoney(summary.paid);
  if (moneyElements.analyticsBalance) moneyElements.analyticsBalance.textContent = `Haraa: ${formatMoney(summary.balance)}`;
  if (moneyElements.analyticsProgress) moneyElements.analyticsProgress.style.width = paidPercent;
  if (moneyElements.analyticsRate) moneyElements.analyticsRate.textContent = `${paidPercent} lacagta ayaa la bixiyay`;
  if (moneyElements.analyticsAverage) moneyElements.analyticsAverage.textContent = formatMoney(summary.average);
  if (moneyElements.analyticsPaidCount) moneyElements.analyticsPaidCount.textContent = String(summary.paidCustomers);
  if (moneyElements.categoryTotal) moneyElements.categoryTotal.textContent = formatMoney(summary.total);
  if (moneyElements.categoryPaid) moneyElements.categoryPaid.textContent = paidPercent;
  if (moneyElements.categoryBalance) moneyElements.categoryBalance.textContent = balancePercent;
  if (moneyElements.billingPaid) moneyElements.billingPaid.textContent = formatMoney(summary.paid);
  if (moneyElements.billingBalance) moneyElements.billingBalance.textContent = formatMoney(summary.balance);
  if (moneyElements.billingTotal) moneyElements.billingTotal.textContent = formatMoney(summary.total);
  if (moneyElements.billingSummary) moneyElements.billingSummary.textContent = `${summary.balanceCustomers} macmiil ayaa haraa leh`;
};

const renderAll = () => {
  selectedCustomer = selectedCustomer || customers[0];
  renderCustomers();
  renderCustomerDirectory();
  renderProfile();
  renderFinancials();
  renderHaraaList();
  if (selectedCustomer) {
    currentCustomer.textContent = selectedCustomer.name;
    measureBreadcrumb.textContent = `Macaamiil > ${selectedCustomer.name}`;
  } else {
    currentCustomer.textContent = "Macmiil lama dooran";
    measureBreadcrumb.textContent = "Macaamiil > Macmiil lama dooran";
  }
  renderSavedMeasurements();
};

document.querySelectorAll("[data-auth-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-auth-tab]").forEach((tab) => tab.classList.remove("is-active"));
    document.querySelectorAll("[data-auth-form]").forEach((form) => form.classList.remove("is-active"));
    button.classList.add("is-active");
    document.querySelector(`[data-auth-form="${button.dataset.authTab}"]`).classList.add("is-active");
    setAuthStatus("");
  });
});

document.querySelector('[data-auth-form="signin"]').addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  signIn(form.get("email"), String(form.get("password") || ""));
});

document.querySelector('[data-auth-form="signup"]').addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  signUp(form.get("name"), form.get("email"), String(form.get("password") || ""));
});

document.querySelector("[data-sign-out]").addEventListener("click", signOut);

navItems.forEach((item) => {
  item.addEventListener("click", () => showView(item.dataset.viewTarget));
});

menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("is-open");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    sidebar.classList.remove("is-open");
    closeCustomerModal();
  }
});

document.querySelectorAll("[data-open-customer], .fab").forEach((button) => {
  button.addEventListener("click", openCustomerModal);
});

document.querySelectorAll("[data-close-customer]").forEach((button) => {
  button.addEventListener("click", closeCustomerModal);
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeCustomerModal();
});

profileModal?.addEventListener("click", (event) => {
  if (event.target === profileModal) closeProfileModal();
});

document.querySelectorAll("[data-open-profile]").forEach((button) => {
  button.addEventListener("click", openProfileModal);
});

document.querySelectorAll("[data-close-profile]").forEach((button) => {
  button.addEventListener("click", closeProfileModal);
});

themeToggle?.addEventListener("click", () => {
  applyTheme(document.body.classList.contains("dark-mode") ? "light" : "dark");
});

searchInput?.addEventListener("input", (event) => {
  renderSearchResults(event.currentTarget.value);
});

searchResults?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-search-customer]");
  if (!button) return;
  searchInput.value = "";
  searchResults.classList.remove("is-open");
  selectCustomerProfile(customers[Number(button.dataset.searchCustomer)]);
});

profileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(profileForm);
  profileSettings = {
    name: String(form.get("name") || "").trim(),
    twofaPhone: String(form.get("twofaPhone") || "").trim(),
    twofaEnabled: form.get("twofaEnabled") === "on",
  };

  const password = String(form.get("password") || "");
  if (password && password.length < 6) {
    profileStatus.textContent = "Password-ku waa inuu ahaadaa ugu yaraan 6 xaraf.";
    profileStatus.dataset.type = "error";
    return;
  }

  try {
    if (password || profileSettings.name) {
      await supabaseRequest("/auth/v1/user", {
        method: "PUT",
        body: JSON.stringify({ ...(password ? { password } : {}), data: { name: profileSettings.name } }),
      });
    }
    writeJson(keys.profile, profileSettings);
    await syncStore(keys.profile, profileSettings);
    if (userPill) userPill.textContent = profileSettings.name || currentUser?.email || "User";
    profileStatus.textContent = profileSettings.twofaEnabled ? "Profile waa la keydiyay. 2FA setting waa daaran yahay." : "Profile waa la keydiyay.";
    profileStatus.dataset.type = "ok";
  } catch (error) {
    profileStatus.textContent = error.message || "Profile lama keydin.";
    profileStatus.dataset.type = "error";
  }
});

customerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(customerForm);
  const customer = {
    id: crypto.randomUUID ? crypto.randomUUID() : `customer-${Date.now()}`,
    name: String(form.get("name") || "").trim(),
    phone: String(form.get("phone") || "").trim(),
    city: String(form.get("city") || "").trim(),
    garment: String(form.get("garment") || "").trim(),
    bixiyey: String(form.get("bixiyey") || "").trim(),
    haraa: String(form.get("haraa") || "").trim(),
    note: String(form.get("note") || "").trim(),
  };

  if (!customer.name || !customer.phone) {
    formStatus.textContent = "Fadlan geli magaca iyo telefoonka.";
    return;
  }

  customers.unshift(customer);
  selectedCustomer = customer;
  const modalRecord = collectModalMeasurementRecord(customer);
  const hasModalMeasurement = Object.keys(modalRecord.values).length || modalRecord.fields.bixiyey || modalRecord.fields.haraa || modalRecord.fields.details;
  if (hasModalMeasurement) {
    measurements[customer.id] = modalRecord;
    customer.bixiyey = modalRecord.fields.bixiyey || customer.bixiyey;
    customer.haraa = modalRecord.fields.haraa || customer.haraa;
  }
  renderAll();
  formStatus.textContent = "Saving customer to Supabase...";
  const savedCustomers = await syncStore(keys.customers, customers);
  const savedMeasurements = hasModalMeasurement ? await syncStore(keys.measurements, measurements) : true;
  const saved = savedCustomers && savedMeasurements;
  formStatus.textContent = saved ? "Macmiilka iyo cabbirka Supabase ayaa lagu keydiyay." : "Macmiilka browser-ka ayuu ku keydsan yahay; Supabase wuu fashilmay.";
  customerForm.reset();
  modalImages = {};
  renderImagePreviews(modalImages, modalImagePreviews);
  closeCustomerModal();
  selectCustomerProfile(customer);
});

customersTable.addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-customer]");
  if (!button) return;
  selectCustomer(customers[Number(button.dataset.selectCustomer)]);
});

customerDirectory?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-profile-customer]");
  if (!button) return;
  selectCustomerProfile(customers[Number(button.dataset.profileCustomer)]);
});

haraaList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-profile-customer]");
  if (!button) return;
  selectCustomerProfile(customers[Number(button.dataset.profileCustomer)]);
});

document.querySelectorAll("[data-modal-image]").forEach((input) => {
  input.addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    modalImages[event.currentTarget.dataset.modalImage] = await fileToDataUrl(file);
    renderImagePreviews(modalImages, modalImagePreviews);
  });
});

document.querySelectorAll("[data-image-upload]").forEach((input) => {
  input.addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file || !selectedCustomer?.id) return;
    const image = await fileToDataUrl(file);
    const existing = measurements[selectedCustomer.id] || collectMeasurementRecord();
    measurements[selectedCustomer.id] = {
      ...existing,
      images: { ...(existing.images || {}), [event.currentTarget.dataset.imageUpload]: image },
      updatedAt: new Date().toISOString(),
    };
    renderImagePreviews(measurements[selectedCustomer.id].images || {});
    await syncStore(keys.measurements, measurements);
  });
});

document.querySelector("[data-edit-profile-measures]")?.addEventListener("click", () => {
  if (!selectedCustomer) {
    openCustomerModal();
    return;
  }
  selectCustomer(selectedCustomer);
});

document.querySelector("[data-save-measurements]").addEventListener("click", async () => {
  if (!selectedCustomer?.id) {
    savedMeasures.innerHTML = "<small>Fadlan marka hore ku dar ama dooro macmiil dhab ah.</small>";
    return;
  }

  const record = collectMeasurementRecord();
  measurements[record.customerId] = record;
  const customerIndex = customers.findIndex((customer) => customer.id === record.customerId);
  if (customerIndex >= 0) {
    customers[customerIndex] = {
      ...customers[customerIndex],
      name: record.fields.name || customers[customerIndex].name,
      phone: record.fields.phone || customers[customerIndex].phone,
      bixiyey: record.fields.bixiyey || customers[customerIndex].bixiyey || "",
      haraa: record.fields.haraa || customers[customerIndex].haraa || "",
    };
    selectedCustomer = customers[customerIndex];
  }
  renderAll();
  renderProfile();
  renderSavedMeasurements();
  const savedCustomers = await syncStore(keys.customers, customers);
  const saved = await syncStore(keys.measurements, measurements);
  savedMeasures.insertAdjacentHTML(
    "beforeend",
    `<small>${saved && savedCustomers ? " Cabbirka iyo lacagta Supabase ayaa lagu keydiyay." : " Supabase save failed; browser backup only."}</small>`
  );
});

document.querySelector("[data-clear-measurements]").addEventListener("click", async () => {
  document.querySelectorAll("[data-measure], [data-field]").forEach((input) => {
    input.value = "";
  });

  if (selectedCustomer?.id) {
    delete measurements[selectedCustomer.id];
    await syncStore(keys.measurements, measurements);
  }

  savedMeasures.innerHTML = "";
});

applyTheme();
initAuth();
