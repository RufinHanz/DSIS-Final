// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC4JIHnTkEczydiS-OoU4FibyzWbCdlHA0",
  authDomain: "dsis-b5f5c.firebaseapp.com",
  projectId: "dsis-b5f5c",
  storageBucket: "dsis-b5f5c.appspot.com",
  messagingSenderId: "414661916496",
  appId: "1:414661916496:web:53d8bcbe838e26c96dde55"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
const productsTableBody = document.querySelector('#productsTable tbody');
const purchasedTableBody = document.querySelector('#purchasedTable tbody');
const totalProductsInput = document.getElementById('total-products');
const totalAmountInput = document.getElementById('total-amount');
const enterAmountInput = document.getElementById('enter-amount');
const proceedBtn = document.getElementById('proceed-btn');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');

// For purchase history
const purchaseHistoryTableBody = document.querySelector('#purchaseHistoryTable tbody');

// State
let allProducts = [];
let categoryMap = {};
let purchasedProducts = [];

// Fetch categories and products, then render table
async function fetchCategoriesAndProducts() {
  // Fetch categories
  const categorySnapshot = await db.collection("categories").get();
  categoryMap = {};
  categorySnapshot.forEach(doc => {
    categoryMap[doc.id] = doc.data().categoryName;
  });

  // Fetch products
  const productSnapshot = await db.collection("products").orderBy("productId", "asc").get();
  allProducts = [];
  productSnapshot.forEach(doc => {
    const data = doc.data();
    data.id = doc.id;
    allProducts.push(data);
  });

  renderProductsTable(allProducts);
}

// Render products in the available table
function renderProductsTable(products) {
  productsTableBody.innerHTML = '';
  products.forEach(prod => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${prod.productId}</td>
      <td>${prod.productName}</td>
      <td>${prod.productDescription}</td>
      <td>${categoryMap[prod.productCategoryId] || "Uncategorized"}</td>
      <td>${prod.productStock}</td>
      <td>₱${parseFloat(prod.productPrice).toFixed(2)}</td>
      <td>
        <button class="buy-btn" data-id="${prod.id}" ${prod.productStock < 1 ? 'disabled' : ''}>Buy</button>
      </td>
    `;
    productsTableBody.appendChild(tr);
  });
}

// Search functionality
searchInput.addEventListener('input', e => {
  const value = e.target.value.toLowerCase();
  const filtered = allProducts.filter(p =>
    p.productName.toLowerCase().includes(value) ||
    p.productDescription.toLowerCase().includes(value) ||
    (categoryMap[p.productCategoryId] || "").toLowerCase().includes(value)
  );
  renderProductsTable(filtered);
});

// Buy button logic
productsTableBody.addEventListener('click', function(e) {
  if (e.target.classList.contains('buy-btn')) {
    const id = e.target.getAttribute('data-id');
    const product = allProducts.find(p => p.id === id);
    if (product && product.productStock > 0) {
      // Check if already in purchased
      let existing = purchasedProducts.find(p => p.id === id);
      if (!existing) {
        purchasedProducts.push({
          ...product,
          toBuy: 1
        });
        renderPurchasedTable();
        updateTotals();
      }
    }
  }
});

// Render purchased products table
function renderPurchasedTable() {
  purchasedTableBody.innerHTML = '';
  purchasedProducts.forEach((prod, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${prod.productId}</td>
      <td>${prod.productName}</td>
      <td>${prod.productDescription}</td>
      <td>${categoryMap[prod.productCategoryId] || "Uncategorized"}</td>
      <td>
        <input type="number" class="stock-input" data-idx="${idx}" min="1" max="${prod.productStock}" value="${prod.toBuy}" style="width:60px;" />
      </td>
      <td>₱${parseFloat(prod.productPrice).toFixed(2)}</td>
      <td>
        <button class="remove-btn" data-idx="${idx}">Remove</button>
      </td>
    `;
    purchasedTableBody.appendChild(tr);
  });
}

// Update/Remove logic
purchasedTableBody.addEventListener('click', function(e) {
  const idx = e.target.getAttribute('data-idx');
  if (e.target.classList.contains('update-btn')) {
    const input = purchasedTableBody.querySelector(`input.stock-input[data-idx="${idx}"]`);
    let val = parseInt(input.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > purchasedProducts[idx].productStock) val = purchasedProducts[idx].productStock;
    purchasedProducts[idx].toBuy = val;
    input.value = val;
    updateTotals();
  }
  if (e.target.classList.contains('remove-btn')) {
    purchasedProducts.splice(idx, 1);
    renderPurchasedTable();
    updateTotals();
  }
});

// Also update on direct input change
purchasedTableBody.addEventListener('input', function(e) {
  if (e.target.classList.contains('stock-input')) {
    const idx = e.target.getAttribute('data-idx');
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > purchasedProducts[idx].productStock) val = purchasedProducts[idx].productStock;
    purchasedProducts[idx].toBuy = val;
    e.target.value = val;
    updateTotals();
  }
});

// Totals logic
function updateTotals() {
  const totalProducts = purchasedProducts.reduce((sum, p) => sum + p.toBuy, 0);
  const totalAmount = purchasedProducts.reduce((sum, p) => sum + (parseFloat(p.productPrice) * p.toBuy), 0);
  totalProductsInput.value = totalProducts;
  totalAmountInput.value = totalAmount.toFixed(2);
}

// --- PURCHASE HISTORY FEATURE ---

// Save purchase batch to Firestore
async function savePurchaseHistory(purchasedProducts, totalAmount, enteredAmount, change) {
  const batchProducts = purchasedProducts.map(p => ({
    productId: p.productId,
    productName: p.productName,
    quantity: p.toBuy,
    amount: parseFloat(p.productPrice) * p.toBuy
  }));

  await db.collection('purchaseHistory').add({
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    products: batchProducts,
    totalQuantity: batchProducts.reduce((sum, p) => sum + p.quantity, 0),
    totalAmount: totalAmount,
    amountPaid: enteredAmount,
    change: change
  });
}

// Fetch and render purchase history
async function fetchAndRenderPurchaseHistory() {
  const snapshot = await db.collection('purchaseHistory').orderBy('timestamp', 'desc').limit(50).get();
  purchaseHistoryTableBody.innerHTML = '';
  snapshot.forEach(doc => {
    const data = doc.data();
    const date = data.timestamp ? data.timestamp.toDate().toLocaleString() : 'N/A';
    const productsList = data.products.map(p => 
      `<div>${p.productName} <span style="color:#888;">(x${p.quantity})</span></div>`
    ).join('');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${date}</td>
      <td>${productsList}</td>
      <td>${data.totalQuantity}</td>
      <td>₱${parseFloat(data.totalAmount).toFixed(2)}</td>
      <td>₱${parseFloat(data.amountPaid).toFixed(2)}</td>
      <td>₱${parseFloat(data.change).toFixed(2)}</td>
    `;
    purchaseHistoryTableBody.appendChild(tr);
  });
}

// --- END OF PURCHASE HISTORY FEATURE ---

// Proceed purchase logic
proceedBtn.addEventListener('click', async function() {
  const totalAmount = parseFloat(totalAmountInput.value);
  const enteredAmount = parseFloat(enterAmountInput.value);
  if (isNaN(enteredAmount) || enteredAmount < totalAmount) {
    alert('Entered amount must be equal to or greater than total amount.');
    return;
  }
  if (purchasedProducts.length === 0) {
    alert('No products to purchase.');
    return;
  }
  // Update stock in Firestore
  try {
    for (let p of purchasedProducts) {
      const prodRef = db.collection('products').doc(p.id);
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(prodRef);
        if (!doc.exists) throw "Product does not exist!";
        const newStock = doc.data().productStock - p.toBuy;
        if (newStock < 0) throw "Insufficient stock!";
        transaction.update(prodRef, { productStock: newStock });
      });
    }
    // --- PURCHASE HISTORY LOGIC ---
    // Make a copy before clearing for history
    const purchasedProductsCopy = purchasedProducts.map(p => ({ ...p }));

    // Show modal receipt
    showReceiptModal(enteredAmount);

    // Save to purchase history
    await savePurchaseHistory(
      purchasedProductsCopy,
      parseFloat(totalAmountInput.value),
      parseFloat(enterAmountInput.value),
      (parseFloat(enterAmountInput.value) - parseFloat(totalAmountInput.value)).toFixed(2)
    );

    // Refresh purchase history table
    await fetchAndRenderPurchaseHistory();

    // Now clear and reset
    purchasedProducts = [];
    await fetchCategoriesAndProducts();
    renderPurchasedTable();
    updateTotals();
    enterAmountInput.value = '';
  } catch (err) {
    alert('Error completing purchase: ' + err);
  }
});

// Modal logic
function showReceiptModal(enteredAmount) {
  const totalProducts = totalProductsInput.value;
  const totalAmount = parseFloat(totalAmountInput.value);
  const change = (enteredAmount - totalAmount).toFixed(2);

  let rows = purchasedProducts.map(p => `
    <tr>
      <td>${p.productName}</td>
      <td>${p.toBuy}</td>
    </tr>
  `).join('');

  modalContent.innerHTML = `
    <h2>Purchased Successfully!</h2>
    <p><strong>Total Products Bought:</strong> ${totalProducts}</p>
    <table>
      <thead>
        <tr><th>Product Name</th><th>Quantity</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p><strong>Total Amount:</strong> ₱${totalAmount.toFixed(2)}</p>
    <p><strong>Change:</strong> ₱${change}</p>
    <button id="print-btn">Print Receipt</button>
  `;
  modal.style.display = 'block';

  document.getElementById('print-btn').onclick = function() {
    printReceipt(rows, totalProducts, totalAmount, change);
    modal.style.display = 'none';
  };
}

// Print logic
function printReceipt(rows, totalProducts, totalAmount, change) {
  // Get cashier name from session (if available)
  let cashier = '';
  try {
    const userData = sessionStorage.getItem('dsisUser');
    if (userData) {
      const user = JSON.parse(userData);
      cashier = user.nickname ? `Cashier: ${user.nickname}` : '';
    }
  } catch {}

  // Build receipt lines
  const now = new Date();
  let receiptLines = [];
  receiptLines.push('      DEPARTMENT STORE');
  receiptLines.push('      Thank you for shopping!');
  receiptLines.push('');
  receiptLines.push(now.toLocaleString());
  if (cashier) receiptLines.push(cashier);
  receiptLines.push('--------------------------------');
  receiptLines.push('Item             Qty    Amount');
  receiptLines.push('--------------------------------');

  // Loop through purchasedProducts for line items
  purchasedProducts.forEach(p => {
    // Truncate/pad product name to 15 chars
    let name = (p.productName.length > 15) ? p.productName.slice(0, 15) : p.productName.padEnd(15, ' ');
    let qty = String(p.toBuy).padStart(3, ' ');
    let amt = ('₱' + (parseFloat(p.productPrice) * p.toBuy).toFixed(2)).padStart(8, ' ');
    receiptLines.push(`${name} ${qty} ${amt}`);
  });

  receiptLines.push('--------------------------------');
  receiptLines.push(`TOTAL ITEMS: ${String(totalProducts).padStart(3, ' ')}`);
  receiptLines.push(`TOTAL:      ₱${parseFloat(totalAmount).toFixed(2)}`);
  receiptLines.push(`CASH:       ₱${parseFloat(enterAmountInput.value).toFixed(2)}`);
  receiptLines.push(`CHANGE:     ₱${parseFloat(change).toFixed(2)}`);
  receiptLines.push('');
  receiptLines.push('--- Please keep this receipt ---');

  // Combine lines for <pre> block
  const receiptHTML = `
    <div style="font-family: 'Courier New', Courier, monospace; font-size: 13px; width: 320px; margin: 0 auto;">
      <pre style="white-space: pre; margin:0;">${receiptLines.join('\n')}</pre>
    </div>
  `;

  // Open print window
  const win = window.open('', '', 'width=400,height=600');
  win.document.write(`
    <html>
    <head>
      <title>Receipt</title>
      <style>
        body { background: #fff; margin: 0; padding: 20px; }
        @media print {
          body { margin:0; }
        }
      </style>
    </head>
    <body>
      ${receiptHTML}
    </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

// Prevent modal close except after print
window.onclick = function(event) {
  if (event.target == modal) {
    // Do nothing, modal can only be closed by print
  }
};

// Initial load
fetchCategoriesAndProducts().then(fetchAndRenderPurchaseHistory);


// ----------------------------------------------------------------------------------
//session for cashier
function fillLoggedInNickname() {
  const userData = sessionStorage.getItem('dsisUser');
  if (!userData) {
    // No user logged in, redirect to login page
    window.location.href = '../pages/login.html';
    return;
  }

  const user = JSON.parse(userData);

  // Check userCategory to confirm this is a cashier
  if (user.userCategory !== 'cashier') {
    alert('Access denied: Not a cashier account.');
    window.location.href = '../pages/login.html';
    return;
  }

  const nicknameInput = document.getElementById('cashiernickname');
  if (nicknameInput) {
    nicknameInput.value = user.nickname || '';
  }
}

// Call the function on page load
window.addEventListener('DOMContentLoaded', fillLoggedInNickname);

//-----------------------------------------------------------
//Casheir Logout session
// Cashier logout function
function cashierLogout() {
  sessionStorage.clear();
  window.location.href = '../pages/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('cashier-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', cashierLogout);
  }

  // Prevent back navigation after logout
  window.history.pushState(null, null, window.location.href);
  window.onpopstate = function () {
    window.history.go(1);
  };

  // Check if user session exists and is cashier
  const userData = sessionStorage.getItem('dsisUser');
  if (!userData) {
    window.location.href = '../pages/login.html';
    return;
  }
  const user = JSON.parse(userData);
  if (user.userCategory !== 'cashier') {
    alert('Access denied.');
    window.location.href = '../pages/login.html';
  }
});

// Escape HTML to avoid XSS
  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, function(m) {
      return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[m];
    });
  }

  function escapeHTML(text){
    return text.replace(/[<>"']/g, function(m){
        return {'&':'&amp', '<':'&lt;', }
    })
  }
