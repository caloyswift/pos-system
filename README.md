# Campus Snack Bar POS

A simple Point-of-Sale (POS) web app for a campus snack bar. A cashier adds products to a cart, adjusts quantities, accepts a cash payment in Philippine pesos (₱), and gets a digital receipt.

Built with plain **HTML, CSS, and vanilla JavaScript**. There are no frameworks, external libraries, databases, or backend services. All data is hard-coded or held in memory, so it resets when the page is refreshed.

## Features

- Six hard-coded products with fixed prices
- Add to cart (adding the same product again increases its quantity)
- Increase, decrease (never below 1), and remove cart items
- Item subtotals and overall total update immediately
- Cash payment input validated in JavaScript:
  - blank, non-numeric, and negative amounts show "Please enter a valid payment amount."
  - amounts with more than two decimal places are also treated as invalid
  - amounts below the total show "Insufficient payment. Please enter at least ₱X.XX." (calculated from the current total)
  - payment is blocked when the cart is empty
- Change computed as `amountPaid - totalAmount` only after payment is validated
- Payment-success message, transaction details, and a digital receipt (transaction number, date/time, items, quantities, unit prices, subtotals, total, amount paid, change)
- Duplicate confirmation prevention: after payment, the cart, product buttons, and payment controls are locked
- "New Transaction" button that clears the cart, payment, messages, confirmation, and receipt

## File Structure

```
snack-bar-pos/
├── index.html   Application structure
├── style.css    Basic styling
├── script.js    Product data, cart, validation, payment, receipt, and reset logic
└── README.md    This file
```

## How to Run

1. Put all four files in the same folder.
2. Open `index.html` in a modern web browser (Chrome, Edge, Firefox, or Safari) by double-clicking it.
3. No installation, build step, or server is needed.

## Example Test

Add 2 Classic Burgers and 1 Soda: the total is ₱135.00. Enter `200` as the payment and click **Confirm Payment**. The change shown is ₱65.00.

## Notes

- The payment box is a text field with a decimal keypad hint (`inputmode="decimal"`) rather than `type="number"`. This lets JavaScript see exactly what was typed, so invalid text can be reported with a clear message instead of being silently dropped by the browser.
- Amounts are stored internally in centavos (whole numbers) to avoid decimal rounding errors.
- The transaction number looks like `TXN-YYYYMMDD-0001`; the counter restarts when the page is refreshed.
