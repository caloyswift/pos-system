// ---------------------------------------------------------------
// Campus Snack Bar POS - all application logic lives in this file.
// Money is stored in centavos (whole numbers) so that arithmetic
// like 0.1 + 0.2 never produces rounding errors.
// ---------------------------------------------------------------

// ----- Product data (hard-coded) -----
const PRODUCTS = [
  { id: 1, name: "Classic Burger", price: 5500, emoji: "🍔" },
  { id: 2, name: "Cheeseburger", price: 6500, emoji: "🧀" },
  { id: 3, name: "Ham Sandwich", price: 4000, emoji: "🥪" },
  { id: 4, name: "French Fries (Regular)", price: 4500, emoji: "🍟" },
  { id: 5, name: "Nachos", price: 5000, emoji: "🌮" },
  { id: 6, name: "Soda (Can)", price: 2500, emoji: "🥤" }
];

// ----- In-memory state -----
let cart = [];                  // items: { id, name, price, emoji, quantity }
let transactionComplete = false; // true after payment is confirmed
const HISTORY_KEY = "campusSnackBarTransactions";
let transactionHistory = loadTransactionHistory();
let transactionCount = transactionHistory.length; // used to build the transaction number

// ----- Page elements -----
const productList = document.getElementById("product-list");
const historyDialog = document.getElementById("history-dialog");
const historyOpenButton = document.getElementById("history-open-button");
const historyCloseButton = document.getElementById("history-close-button");
const historyDoneButton = document.getElementById("history-done-button");
const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");
const historyDetails = document.getElementById("history-details");
const addMessage = document.getElementById("add-message");
const cartEmpty = document.getElementById("cart-empty");
const cartTable = document.getElementById("cart-table");
const cartBody = document.getElementById("cart-body");
const cartTotal = document.getElementById("cart-total");
const paymentForm = document.getElementById("payment-form");
const paymentInput = document.getElementById("payment-input");
const payButton = document.getElementById("pay-button");
const paymentError = document.getElementById("payment-error");
const confirmationSection = document.getElementById("confirmation-section");
const paymentSuccess = document.getElementById("payment-success");
const transactionDetails = document.getElementById("transaction-details");
const viewReceiptButton = document.getElementById("view-receipt-button");
const newTransactionButton = document.getElementById("new-transaction-button");
const receiptDialog = document.getElementById("receipt-dialog");
const receiptBox = document.getElementById("receipt");
const receiptCloseX = document.getElementById("receipt-close-x");
const receiptCloseButton = document.getElementById("receipt-close-button");
const receiptNewTransactionButton = document.getElementById("receipt-new-transaction-button");

// ----- Helpers -----

// Format centavos as pesos, e.g. 13500 -> "₱135.00"
function formatPeso(centavos) {
  return "₱" + (centavos / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getTotal() {
  let total = 0;
  for (const item of cart) {
    total += item.price * item.quantity;
  }
  return total;
}

// Create an element with text (textContent is safe from HTML injection)
function makeElement(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}

function loadTransactionHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function saveTransactionHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(transactionHistory));
  } catch (error) {
    // The current session remains usable when browser storage is unavailable.
  }
}

// ----- Products -----

function renderProducts() {
  productList.innerHTML = "";
  for (const product of PRODUCTS) {
    const li = makeElement("li", undefined, "product-card");

    const emoji = makeElement("span", product.emoji, "product-emoji");
    emoji.setAttribute("aria-hidden", "true");

    const button = makeElement("button", "Add to Cart");
    button.type = "button";
    button.id = "add-" + product.id;
    button.setAttribute("aria-label", "Add " + product.name + " to cart");
    button.addEventListener("click", function () {
      addToCart(product.id);
    });

    li.appendChild(emoji);
    li.appendChild(makeElement("span", product.name, "product-name"));
    li.appendChild(makeElement("span", formatPeso(product.price), "product-price"));
    li.appendChild(button);
    productList.appendChild(li);
  }
}

// ----- Cart operations -----

function addToCart(productId) {
  if (transactionComplete) return;

  const product = PRODUCTS.find(function (p) { return p.id === productId; });
  const existing = cart.find(function (item) { return item.id === productId; });

  if (existing) {
    existing.quantity += 1; // repeated additions increase quantity
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      emoji: product.emoji,
      quantity: 1
    });
  }

  addMessage.textContent = "Added " + product.name + " to cart.";
  clearPaymentError();
  renderCart();
}

function increaseQuantity(productId) {
  if (transactionComplete) return;
  const item = cart.find(function (i) { return i.id === productId; });
  if (item) item.quantity += 1;
  clearPaymentError();
  renderCart();
}

function decreaseQuantity(productId) {
  if (transactionComplete) return;
  const item = cart.find(function (i) { return i.id === productId; });
  if (item && item.quantity > 1) item.quantity -= 1; // never below one
  clearPaymentError();
  renderCart();
}

function removeItem(productId) {
  if (transactionComplete) return;
  cart = cart.filter(function (i) { return i.id !== productId; });
  clearPaymentError();
  renderCart();
}

function renderCart() {
  cartBody.innerHTML = "";

  for (const item of cart) {
    const row = document.createElement("tr");

    // Item name with emoji and unit price
    const nameCell = document.createElement("td");
    const nameLine = makeElement("div", undefined, "item-name");
    const itemEmoji = makeElement("span", item.emoji, "item-emoji");
    itemEmoji.setAttribute("aria-hidden", "true");
    nameLine.appendChild(itemEmoji);
    nameLine.appendChild(document.createTextNode(item.name));
    nameCell.appendChild(nameLine);
    nameCell.appendChild(makeElement("div", formatPeso(item.price) + " each", "item-unit"));
    row.appendChild(nameCell);

    // Quantity cell with - and + buttons
    const qtyCell = makeElement("td", undefined, "center qty-cell");
    const minus = makeElement("button", "−");
    minus.type = "button";
    minus.setAttribute("aria-label", "Decrease quantity of " + item.name);
    minus.disabled = transactionComplete || item.quantity <= 1;
    minus.addEventListener("click", function () { decreaseQuantity(item.id); });

    const qty = makeElement("span", String(item.quantity));

    const plus = makeElement("button", "+");
    plus.type = "button";
    plus.setAttribute("aria-label", "Increase quantity of " + item.name);
    plus.disabled = transactionComplete;
    plus.addEventListener("click", function () { increaseQuantity(item.id); });

    qtyCell.appendChild(minus);
    qtyCell.appendChild(qty);
    qtyCell.appendChild(plus);
    row.appendChild(qtyCell);

    // Subtotal
    row.appendChild(makeElement("td", formatPeso(item.price * item.quantity), "num"));

    // Remove button
    const removeCell = document.createElement("td");
    const remove = makeElement("button", "✕", "remove-button");
    remove.type = "button";
    remove.setAttribute("aria-label", "Remove " + item.name + " from cart");
    remove.disabled = transactionComplete;
    remove.addEventListener("click", function () { removeItem(item.id); });
    removeCell.appendChild(remove);
    row.appendChild(removeCell);

    cartBody.appendChild(row);
  }

  const hasItems = cart.length > 0;
  cartTable.hidden = !hasItems;
  cartEmpty.hidden = hasItems;
  cartTotal.textContent = formatPeso(getTotal());

  // Product buttons and payment controls are locked after payment
  for (const product of PRODUCTS) {
    document.getElementById("add-" + product.id).disabled = transactionComplete;
  }
  payButton.disabled = transactionComplete || !hasItems;
  paymentInput.disabled = transactionComplete;
}

// ----- Payment -----

function clearPaymentError() {
  paymentError.textContent = "";
}

// Checks the text the cashier typed. Returns { valid, centavos }.
// Accepts plain numbers with up to two decimal places (e.g. 200, 200.5, .5).
function parsePayment(text) {
  const trimmed = text.trim();
  if (trimmed === "") return { valid: false };                 // blank
  if (!/^(\d+(\.\d{1,2})?|\.\d{1,2})$/.test(trimmed)) {
    return { valid: false };                                    // non-numeric, negative, too many decimals
  }
  const pesos = parseFloat(trimmed);
  return { valid: true, centavos: Math.round(pesos * 100) };
}

function processPayment() {
  // Prevent duplicate confirmation for the same transaction
  if (transactionComplete) return;

  clearPaymentError();

  if (cart.length === 0) {
    paymentError.textContent = "The cart is empty. Add at least one product before paying.";
    return;
  }

  const total = getTotal();
  const result = parsePayment(paymentInput.value);

  if (!result.valid) {
    paymentError.textContent = "Please enter a valid payment amount.";
    return;
  }

  if (result.centavos < total) {
    paymentError.textContent = "Insufficient payment. Please enter at least " + formatPeso(total) + ".";
    return;
  }

  // Payment is valid: compute change and finish the transaction
  const amountPaid = result.centavos;
  const change = amountPaid - total;

  transactionComplete = true;
  transactionCount += 1;

  const now = new Date();
  const reference = makeTransactionReference(now, transactionCount);

  const transaction = {
    reference: reference,
    date: now.toISOString(),
    items: cart.map(function (item) { return { ...item }; }),
    total: total,
    amountPaid: amountPaid,
    change: change
  };
  transactionHistory.unshift(transaction);
  saveTransactionHistory();
  renderHistory();

  renderCart(); // locks the cart, product buttons and payment controls
  showConfirmation(reference, now, total, amountPaid, change);
}

function renderHistory() {
  historyList.innerHTML = "";
  historyEmpty.hidden = transactionHistory.length > 0;
  historyDetails.hidden = true;
  historyDetails.innerHTML = "";

  for (const transaction of transactionHistory) {
    const li = document.createElement("li");
    const button = makeElement("button", undefined, "history-entry");
    button.type = "button";
    button.appendChild(makeElement("strong", transaction.reference));
    button.appendChild(makeElement("span", new Date(transaction.date).toLocaleString()));
    button.appendChild(makeElement("span", formatPeso(transaction.total)));
    button.addEventListener("click", function () { showHistoryDetails(transaction); });
    li.appendChild(button);
    historyList.appendChild(li);
  }
}

function openHistory() {
  renderHistory();
  if (typeof historyDialog.showModal === "function") historyDialog.showModal();
  else historyDialog.setAttribute("open", "");
}

function closeHistory() {
  if (typeof historyDialog.close === "function") historyDialog.close();
  else historyDialog.removeAttribute("open");
}

function showHistoryDetails(transaction) {
  historyDetails.innerHTML = "";
  historyDetails.hidden = false;
  historyDetails.appendChild(makeElement("h3", transaction.reference));
  historyDetails.appendChild(makeElement("p", new Date(transaction.date).toLocaleString()));

  const table = document.createElement("table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Item", "Qty", "Subtotal"].forEach(function (label, index) {
    headRow.appendChild(makeElement("th", label, index === 0 ? "" : "num"));
  });
  head.appendChild(headRow);
  table.appendChild(head);
  const body = document.createElement("tbody");
  for (const item of transaction.items) {
    const row = document.createElement("tr");
    row.appendChild(makeElement("td", item.name));
    row.appendChild(makeElement("td", String(item.quantity), "num"));
    row.appendChild(makeElement("td", formatPeso(item.price * item.quantity), "num"));
    body.appendChild(row);
  }
  table.appendChild(body);
  historyDetails.appendChild(table);
  historyDetails.appendChild(makeElement("p", "Total: " + formatPeso(transaction.total)));
  historyDetails.appendChild(makeElement("p", "Paid: " + formatPeso(transaction.amountPaid)));
  historyDetails.appendChild(makeElement("p", "Change: " + formatPeso(transaction.change)));
}

function makeTransactionReference(date, number) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return "TXN-" + y + m + d + "-" + String(number).padStart(4, "0");
}

// ----- Confirmation and receipt -----

function showConfirmation(reference, date, total, amountPaid, change) {
  confirmationSection.hidden = false;
  paymentSuccess.textContent = "Payment successful!";

  transactionDetails.innerHTML = "";
  transactionDetails.appendChild(makeElement("p", "Transaction number: " + reference));
  transactionDetails.appendChild(makeElement("p", "Amount paid: " + formatPeso(amountPaid)));
  transactionDetails.appendChild(makeElement("p", "Change: " + formatPeso(change)));

  buildReceipt(reference, date, total, amountPaid, change);
  openReceipt();
}

// Open and close the receipt pop-up (falls back to the "open" attribute
// in browsers without the <dialog> methods)
function openReceipt() {
  if (receiptDialog.open) return;
  if (typeof receiptDialog.showModal === "function") {
    receiptDialog.showModal();
  } else {
    receiptDialog.setAttribute("open", "");
  }
  receiptBox.scrollTop = 0;
  receiptNewTransactionButton.focus();
}

function closeReceipt() {
  if (typeof receiptDialog.close === "function") {
    receiptDialog.close();
  } else {
    receiptDialog.removeAttribute("open");
  }
}

function buildReceipt(reference, date, total, amountPaid, change) {
  receiptBox.innerHTML = "";

  const title = makeElement("div", undefined, "receipt-title");
  title.appendChild(makeElement("strong", "Campus Snack Bar"));
  title.appendChild(makeElement("span", "Official Receipt"));
  receiptBox.appendChild(title);

  receiptBox.appendChild(makeElement("p", "Transaction No.: " + reference));
  receiptBox.appendChild(makeElement("p", "Date/Time: " + date.toLocaleString()));

  const table = document.createElement("table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const headings = ["Product", "Qty", "Unit Price", "Subtotal"];
  for (let i = 0; i < headings.length; i++) {
    headRow.appendChild(makeElement("th", headings[i], i === 0 ? "" : "num"));
  }
  head.appendChild(headRow);
  table.appendChild(head);

  const body = document.createElement("tbody");
  for (const item of cart) {
    const row = document.createElement("tr");
    row.appendChild(makeElement("td", item.name));
    row.appendChild(makeElement("td", String(item.quantity), "num"));
    row.appendChild(makeElement("td", formatPeso(item.price), "num"));
    row.appendChild(makeElement("td", formatPeso(item.price * item.quantity), "num"));
    body.appendChild(row);
  }
  table.appendChild(body);
  receiptBox.appendChild(table);

  const totals = makeElement("div", undefined, "receipt-totals");
  const lines = [
    ["Total Amount Due:", formatPeso(total), "grand"],
    ["Amount Paid:", formatPeso(amountPaid), ""],
    ["Change:", formatPeso(change), ""]
  ];
  for (const line of lines) {
    const p = makeElement("p", undefined, line[2]);
    p.appendChild(makeElement("span", line[0]));
    p.appendChild(makeElement("span", line[1]));
    totals.appendChild(p);
  }
  receiptBox.appendChild(totals);

  receiptBox.appendChild(makeElement("p", "Thank you! 🍟", "receipt-thanks"));
}

// ----- New transaction -----

function startNewTransaction() {
  cart = [];
  transactionComplete = false;

  closeReceipt();

  paymentInput.value = "";
  clearPaymentError();
  addMessage.textContent = "";

  paymentSuccess.textContent = "";
  transactionDetails.innerHTML = "";
  receiptBox.innerHTML = "";
  confirmationSection.hidden = true;

  renderCart();
  paymentInput.focus();
}

// ----- Event listeners and startup -----

paymentForm.addEventListener("submit", function (event) {
  event.preventDefault(); // stay on the page; Enter key also confirms payment
  processPayment();
});

paymentInput.addEventListener("input", clearPaymentError);
historyOpenButton.addEventListener("click", openHistory);
historyCloseButton.addEventListener("click", closeHistory);
historyDoneButton.addEventListener("click", closeHistory);
viewReceiptButton.addEventListener("click", openReceipt);
newTransactionButton.addEventListener("click", startNewTransaction);
receiptNewTransactionButton.addEventListener("click", startNewTransaction);
receiptCloseX.addEventListener("click", closeReceipt);
receiptCloseButton.addEventListener("click", closeReceipt);

renderProducts();
renderCart();
renderHistory();
