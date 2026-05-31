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
const storageKey = "somali-tailor-customers";

const defaultCustomers = [
  { name: "Ahmed Hassan", phone: "+252 61 555 1001", city: "Muqdisho", garment: "Suud Aroos" },
  { name: "Muna Farah", phone: "+252 61 555 1002", city: "Hargeysa", garment: "Dharka Habeenka" },
];

const loadCustomers = () => {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || defaultCustomers;
  } catch {
    return defaultCustomers;
  }
};

const saveCustomers = () => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(customers));
  } catch {
    formStatus.textContent = "Macmiilka waa la keydiyay fadhigan.";
  }
};

const customers = loadCustomers();

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const showView = (viewId) => {
  views.forEach((view) => view.classList.toggle("is-active", view.id === viewId));
  navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.viewTarget === viewId));
  sidebar.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

navItems.forEach((item) => {
  item.addEventListener("click", () => showView(item.dataset.viewTarget));
});

menuToggle.addEventListener("click", () => {
  const isOpen = sidebar.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    sidebar.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    closeCustomerModal();
  }
});

const initials = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const openCustomerModal = () => {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  customerForm.elements.name.focus();
};

function closeCustomerModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

const selectCustomer = (customer) => {
  currentCustomer.textContent = customer.name;
  measureBreadcrumb.textContent = `Macaamiil > ${customer.name}`;
  document.querySelector('[data-field="name"]').value = customer.name;
  document.querySelector('[data-field="phone"]').value = customer.phone;
  showView("measurements");
};

const renderCustomers = () => {
  customersTable.innerHTML = customers
    .map((customer, index) => {
      const name = escapeHtml(customer.name);
      const garment = escapeHtml(customer.garment || "Macmiil cusub");

      return `
        <tr>
          <td><span class="mini-avatar ${index % 2 ? "gold" : "navy"}">${initials(customer.name)}</span><div>${name}<small>${garment}</small></div></td>
          <td><mark class="${index % 2 ? "gray" : ""}">${index === 0 ? "Tolid" : "Cabbir"}</mark></td>
          <td>Maanta</td>
          <td><button class="table-action" data-select-customer="${index}">Cabbir</button></td>
        </tr>`;
    })
    .join("");
};

document.querySelectorAll("[data-open-customer], .fab").forEach((button) => {
  button.addEventListener("click", openCustomerModal);
});

document.querySelectorAll("[data-close-customer]").forEach((button) => {
  button.addEventListener("click", closeCustomerModal);
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeCustomerModal();
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
  saveCustomers();
  renderCustomers();
  formStatus.textContent = "Macmiilka waa la keydiyay.";
  customerForm.reset();
  closeCustomerModal();
  selectCustomer(customer);
});

customersTable.addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-customer]");
  if (!button) return;
  selectCustomer(customers[Number(button.dataset.selectCustomer)]);
});

document.querySelector("[data-save-measurements]").addEventListener("click", () => {
  const values = [...document.querySelectorAll("[data-measure]")]
    .filter((input) => input.value.trim())
    .map((input) => {
      const item = document.createElement("span");
      item.textContent = `${input.dataset.measure}: ${input.value.trim()}`;
      return item.outerHTML;
    });

  savedMeasures.innerHTML = values.length ? values.join("") : "<small>Weli cabbir lama gelin.</small>";
});

document.querySelector("[data-clear-measurements]").addEventListener("click", () => {
  document.querySelectorAll("[data-measure], [data-field]").forEach((input) => {
    input.value = "";
  });
  savedMeasures.innerHTML = "";
});

renderCustomers();
