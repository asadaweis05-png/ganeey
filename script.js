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

const supabaseConfig = {
  url: "https://tfsxyxmbueosgfkwfnqq.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmc3h5eG1idWVvc2dma3dmbnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDQyNDYsImV4cCI6MjA5NTk4MDI0Nn0.0zjZGnbdY-dPZReHXkeCyxO25rNoFKlxTVli7aKLxoU",
};

const keys = {
  customers: "tailor-system-customers",
  measurements: "tailor-system-measurements",
  session: "tailor-system-supabase-session",
};

const defaultCustomers = [
  { id: "sample-ahmed", name: "Ahmed Hassan", phone: "+252 61 555 1001", city: "Muqdisho", garment: "Suud Aroos", note: "" },
  { id: "sample-muna", name: "Muna Farah", phone: "+252 61 555 1002", city: "Hargeysa", garment: "Dharka Habeenka", note: "" },
];

let customers = [];
let measurements = {};
let selectedCustomer = null;
let currentUser = null;
let supabaseReady = false;

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
  if (userPill) userPill.textContent = userNameFrom(user);
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
};

const loadSupabaseState = async () => {
  customers = readJson(keys.customers, defaultCustomers);
  measurements = readJson(keys.measurements, {});

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
  customers = remote[keys.customers] || customers;
  measurements = remote[keys.measurements] || measurements;
  writeJson(keys.customers, customers);
  writeJson(keys.measurements, measurements);
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

const openCustomerModal = () => {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  customerForm.elements.name.focus();
};

function closeCustomerModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

const selectCustomer = (customer) => {
  selectedCustomer = customer;
  currentCustomer.textContent = customer.name;
  measureBreadcrumb.textContent = `Macaamiil > ${customer.name}`;
  document.querySelector('[data-field="name"]').value = customer.name;
  document.querySelector('[data-field="phone"]').value = customer.phone;
  renderSavedMeasurements();
  showView("measurements");
};

const renderCustomers = () => {
  customersTable.innerHTML = customers
    .map(
      (customer, index) => `
        <tr>
          <td><span class="mini-avatar ${index % 2 ? "gold" : "navy"}">${initials(customer.name)}</span><div>${escapeHtml(customer.name)}<small>${escapeHtml(customer.garment || "Macmiil cusub")}</small></div></td>
          <td><mark class="${index % 2 ? "gray" : ""}">${index === 0 ? "Tolid" : "Cabbir"}</mark></td>
          <td>Maanta</td>
          <td><button class="table-action" data-select-customer="${index}">Cabbir</button></td>
        </tr>`
    )
    .join("");
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
    updatedAt: new Date().toISOString(),
  };
};

const renderSavedMeasurements = () => {
  const record = selectedCustomer ? measurements[selectedCustomer.id] : null;
  if (!record?.values || !Object.keys(record.values).length) {
    savedMeasures.innerHTML = "<small>Weli cabbir lama gelin.</small>";
    return;
  }

  savedMeasures.innerHTML = Object.entries(record.values)
    .map(([label, value]) => `<span>${escapeHtml(label)}: ${escapeHtml(value)}</span>`)
    .join("");
};

const renderAll = () => {
  if (!customers.length) customers = [...defaultCustomers];
  selectedCustomer = selectedCustomer || customers[0];
  renderCustomers();
  if (selectedCustomer) {
    currentCustomer.textContent = selectedCustomer.name;
    measureBreadcrumb.textContent = `Macaamiil > ${selectedCustomer.name}`;
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

customerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(customerForm);
  const customer = {
    id: crypto.randomUUID ? crypto.randomUUID() : `customer-${Date.now()}`,
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
  renderAll();
  formStatus.textContent = "Saving customer to Supabase...";
  const saved = await syncStore(keys.customers, customers);
  formStatus.textContent = saved ? "Macmiilka Supabase ayaa lagu keydiyay." : "Macmiilka browser-ka ayuu ku keydsan yahay; Supabase wuu fashilmay.";
  customerForm.reset();
  closeCustomerModal();
  selectCustomer(customer);
});

customersTable.addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-customer]");
  if (!button) return;
  selectCustomer(customers[Number(button.dataset.selectCustomer)]);
});

document.querySelector("[data-save-measurements]").addEventListener("click", async () => {
  const record = collectMeasurementRecord();
  measurements[record.customerId] = record;
  renderSavedMeasurements();
  const saved = await syncStore(keys.measurements, measurements);
  savedMeasures.insertAdjacentHTML(
    "beforeend",
    `<small>${saved ? " Cabbirka Supabase ayaa lagu keydiyay." : " Supabase save failed; browser backup only."}</small>`
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

initAuth();
