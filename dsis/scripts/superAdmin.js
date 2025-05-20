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
  
  // --- DOM Elements ---
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('main > section');
  const logoutBtn = document.getElementById('logoutBtn');
  
  // Dashboard
  const dashboardCategoriesDiv = document.getElementById('dashboardCategories');
  const dashboardProductsTableContainer = document.getElementById('dashboardProductsTableContainer');
  const dashboardProductsTableTitle = document.getElementById('dashboardProductsTableTitle');
  const dashboardProductsTableBody = document.querySelector('#dashboardProductsTable tbody');
  
  // Products
  const productNameInput = document.getElementById('productname');
  const productDescriptionInput = document.getElementById('productdescription');
  const productCategorySelect = document.getElementById('productCategorySelect');
  const productPriceInput = document.getElementById('productprice');
  const addProductBtn = document.getElementById('addProductBtn');
  const productTableBody = document.querySelector('#updateproduct tbody');
  const searchInput = document.getElementById('searchInput');
  const statusMessage = document.getElementById('statusMessage');
  
  // Edit Product Popup
  const productEditPopup = document.getElementById('productEditPopup');
  const editProductNameInput = document.getElementById('editProductName');
  const editProductDescriptionInput = document.getElementById('editProductDescription');
  const editProductCategorySelect = document.getElementById('editProductCategorySelect');
  const editProductStockInput = document.getElementById('editProductStock');
  const editProductPriceInput = document.getElementById('editProductPrice');
  const saveEditProductBtn = document.getElementById('saveEditProduct');
  
  // Category
  const categoryNameInput = document.getElementById('categoryname');
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  const categoryTableBody = document.querySelector('#updatecategory tbody');
  const searchCategoryInput = document.getElementById('searchCategory');
  const statusMessageCategory = document.getElementById('statusMessageCategory');
  
  // Edit Category Popup
  const categoryEditPopup = document.getElementById('categoryEditPopup');
  const editCategoryNameInput = document.getElementById('editCategoryName');
  const saveCategoryBtn = document.getElementById('saveCategory');
  
  // Product Stock
  const productStockTableBody = document.querySelector('#productStockTable tbody');
  const outOfStockTableBody = document.querySelector('#outOfStockTable tbody');
  const statusMessageStock = document.getElementById('statusMessageStock');
  
  // --- State ---
  let categories = [];
  let products = [];
  let editingProductId = null;
  let editingCategoryId = null;
  
  // --- Navigation ---
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      if (link.id === "logoutBtn") { e.preventDefault(); return; }
      e.preventDefault();
      const sectionId = link.getAttribute('href').substring(1);
      sections.forEach(section => section.style.display = 'none');
      document.getElementById(sectionId).style.display = 'block';
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      if (sectionId === "dashboard") renderDashboardCategories();
      if (sectionId === "productstock") renderProductStockTables();
    });
  });
  
  // --- Dashboard: Show categories as divs, click to show products in table ---
  function renderDashboardCategories() {
    dashboardCategoriesDiv.innerHTML = '';
    dashboardProductsTableContainer.style.display = 'none';
    categories.forEach(cat => {
      const catProducts = products.filter(p => p.productCategoryId === cat.id);
      const div = document.createElement('div');
      div.className = 'category-box';
      div.innerHTML = `<strong>${cat.categoryName}</strong><br><span>${catProducts.length} product(s)</span>`;
      div.addEventListener('click', () => showDashboardCategoryProducts(cat, catProducts));
      dashboardCategoriesDiv.appendChild(div);
    });
  }
  function showDashboardCategoryProducts(category, catProducts) {
    dashboardProductsTableTitle.textContent = `Products in "${category.categoryName}"`;
    dashboardProductsTableBody.innerHTML = '';
    catProducts.forEach(product => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${product.productId}</td>
        <td>${product.productName}</td>
        <td>${product.productDescription}</td>
        <td>${product.productStock}</td>
        <td>${product.productPrice}</td>
        <td>
          <button onclick="editProduct('${product.id}')">Edit</button>
          <button onclick="deleteProduct('${product.id}')">Delete</button>
        </td>
      `;
      dashboardProductsTableBody.appendChild(tr);
    });
    dashboardProductsTableContainer.style.display = 'block';
  }
  
  // --- Product Stock: Two tables (in-stock & out-of-stock) ---
  function renderProductStockTables() {
    // In-stock table
    const inStock = products.filter(p => p.productStock > 0);
    productStockTableBody.innerHTML = '';
    inStock.forEach(product => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${product.productId}</td>
        <td>${product.productName}</td>
        <td>${product.productDescription}</td>
        <td>${product.productStock}</td>
        <td>
          <input type="number" value="0" min="-9999" max="9999" style="width:70px;" id="updateStockInput-${product.id}">
        </td>
        <td>
          <button onclick="updateStock('${product.id}')">Update Stock</button>
        </td>
      `;
      productStockTableBody.appendChild(tr);
    });
  
    // Out-of-stock table
    const outOfStock = products.filter(p => p.productStock <= 0);
    outOfStockTableBody.innerHTML = '';
    outOfStock.forEach(product => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${product.productId}</td>
        <td>${product.productName}</td>
        <td>${product.productDescription}</td>
        <td>${product.productStock}</td>
        <td>
          <button onclick="addStockFromOut('${product.id}')">Add Stock</button>
        </td>
      `;
      outOfStockTableBody.appendChild(tr);
    });
  }
  
  // --- Update stock (add/reduce) ---
  window.updateStock = async function(productId) {
    const input = document.getElementById(`updateStockInput-${productId}`);
    const value = parseInt(input.value, 10);
    if (isNaN(value) || value === 0) return alert("Enter a non-zero value.");
    const productRef = db.collection('products').doc(productId);
    await db.runTransaction(async transaction => {
      const doc = await transaction.get(productRef);
      if (!doc.exists) throw "Product not found";
      let newStock = (doc.data().productStock || 0) + value;
      if (newStock < 0) newStock = 0;
      transaction.update(productRef, { productStock: newStock });
    });
    await refreshData();
    renderProductStockTables();
  };
  
  // --- Add stock from out-of-stock table ---
  window.addStockFromOut = async function(productId) {
    const amount = prompt("Enter stock to add:", "1");
    const value = parseInt(amount, 10);
    if (isNaN(value) || value <= 0) return alert("Enter a positive value.");
    const productRef = db.collection('products').doc(productId);
    await db.runTransaction(async transaction => {
      const doc = await transaction.get(productRef);
      if (!doc.exists) throw "Product not found";
      let newStock = (doc.data().productStock || 0) + value;
      transaction.update(productRef, { productStock: newStock });
    });
    await refreshData();
    renderProductStockTables();
  };
  
  // --- Products: Add, Edit, Delete, Search ---
  addProductBtn.addEventListener('click', async () => {
    const name = productNameInput.value.trim();
    const description = productDescriptionInput.value.trim();
    const categoryId = productCategorySelect.value;
    const price = productPriceInput.value.trim();
  
    if (!name || !description || !categoryId || !price) {
      statusMessage.textContent = 'Please fill in all product fields.';
      return;
    }
  
    // Automatically set stock = 1 on product creation
    const newProduct = {
      productId: await generateNextProductId(),
      productName: name,
      productDescription: description,
      productCategoryId: categoryId,
      productStock: 1,
      productPrice: price
    };
  
    try {
      await db.collection('products').add(newProduct);
      statusMessage.textContent = 'Product added successfully with initial stock 1.';
      productNameInput.value = '';
      productDescriptionInput.value = '';
      productCategorySelect.value = '';
      productPriceInput.value = '';
      await refreshData();
      renderProductTable();
      renderDashboardCategories();
      renderProductStockTables();
    } catch (error) {
      statusMessage.textContent = 'Error adding product: ' + error.message;
    }
  });
  
  async function generateNextProductId() {
    if (products.length === 0) return 1;
    const maxId = Math.max(...products.map(p => Number(p.productId)));
    return maxId + 1;
  }
  
  function renderProductTable(filtered = null) {
    const list = filtered || products;
    productTableBody.innerHTML = '';
    list.forEach(product => {
      const category = categories.find(c => c.id === product.productCategoryId);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${product.productId}</td>
        <td>${product.productName}</td>
        <td>${product.productDescription}</td>
        <td>${category ? category.categoryName : 'Uncategorized'}</td>
        <td>${product.productStock}</td>
        <td>${product.productPrice}</td>
        <td>
          <button onclick="editProduct('${product.id}')">Edit</button>
          <button onclick="deleteProduct('${product.id}')">Delete</button>
        </td>
      `;
      productTableBody.appendChild(tr);
    });
  }
  
  window.editProduct = function(id) {
    editingProductId = id;
    const product = products.find(p => p.id === id);
    if (product) {
      editProductNameInput.value = product.productName;
      editProductDescriptionInput.value = product.productDescription;
      editProductCategorySelect.value = product.productCategoryId;
      editProductStockInput.value = product.productStock;
      editProductPriceInput.value = product.productPrice;
      productEditPopup.style.display = 'flex';
    }
  };
  window.deleteProduct = async function(id) {
    if (confirm("Are you sure you want to delete this product?")) {
      await db.collection('products').doc(id).delete();
      await refreshData();
      renderProductTable();
      renderDashboardCategories();
      renderProductStockTables();
    }
  };
  saveEditProductBtn.addEventListener('click', async () => {
    if (!editingProductId) return;
    const updatedProduct = {
      productName: editProductNameInput.value.trim(),
      productDescription: editProductDescriptionInput.value.trim(),
      productCategoryId: editProductCategorySelect.value,
      productStock: Number(editProductStockInput.value),
      productPrice: editProductPriceInput.value.trim()
    };
    if (
      !updatedProduct.productName ||
      !updatedProduct.productDescription ||
      !updatedProduct.productCategoryId ||
      isNaN(updatedProduct.productStock) ||
      !updatedProduct.productPrice
    ) {
      alert('Please fill in all product fields correctly.');
      return;
    }
    await db.collection('products').doc(editingProductId).update(updatedProduct);
    productEditPopup.style.display = 'none';
    await refreshData();
    renderProductTable();
    renderDashboardCategories();
    renderProductStockTables();
  });
  document.querySelector('#productEditPopup .close-btn').addEventListener('click', () => {
    productEditPopup.style.display = 'none';
  });
  
  // --- Products: Search ---
  searchInput.addEventListener('input', e => {
    const term = e.target.value.toLowerCase();
    const filtered = products.filter(p =>
      p.productName.toLowerCase().includes(term) ||
      p.productDescription.toLowerCase().includes(term) ||
      (categories.find(c => c.id === p.productCategoryId)?.categoryName.toLowerCase() || '').includes(term)
    );
    renderProductTable(filtered);
  });
  
  // --- Categories: Add, Edit, Delete, Search ---
  addCategoryBtn.addEventListener('click', async () => {
    const name = categoryNameInput.value.trim();
    if (!name) {
      statusMessageCategory.textContent = 'Please enter a category name.';
      return;
    }
    await db.collection('categories').add({ categoryName: name });
    categoryNameInput.value = '';
    await refreshData();
    renderCategoryTable();
    renderDashboardCategories();
  });
  function renderCategoryTable(filtered = null) {
    const list = filtered || categories;
    categoryTableBody.innerHTML = '';
    list.forEach(category => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${category.id}</td>
        <td>${category.categoryName}</td>
        <td>
          <button onclick="editCategory('${category.id}')">Edit</button>
          <button onclick="deleteCategory('${category.id}')">Delete</button>
        </td>
      `;
      categoryTableBody.appendChild(tr);
    });
  }
  window.editCategory = function(id) {
    editingCategoryId = id;
    const category = categories.find(c => c.id === id);
    if (category) {
      editCategoryNameInput.value = category.categoryName;
      categoryEditPopup.style.display = 'flex';
    }
  };
  window.deleteCategory = async function(id) {
    if (confirm("Are you sure you want to delete this category?")) {
      await db.collection('categories').doc(id).delete();
      await refreshData();
      renderCategoryTable();
      renderDashboardCategories();
    }
  };
  saveCategoryBtn.addEventListener('click', async () => {
    if (!editingCategoryId) return;
    const newName = editCategoryNameInput.value.trim();
    if (!newName) {
      alert('Category name cannot be empty.');
      return;
    }
    await db.collection('categories').doc(editingCategoryId).update({ categoryName: newName });
    categoryEditPopup.style.display = 'none';
    await refreshData();
    renderCategoryTable();
    renderDashboardCategories();
  });
  document.querySelector('#categoryEditPopup .close-btn').addEventListener('click', () => {
    categoryEditPopup.style.display = 'none';
  });
  searchCategoryInput.addEventListener('input', e => {
    const term = e.target.value.toLowerCase();
    const filtered = categories.filter(c => c.categoryName.toLowerCase().includes(term));
    renderCategoryTable(filtered);
  });
  
  // --- Helper: Refresh all data and dropdowns ---
  async function refreshData() {
    categories = await fetchCategories();
    products = await fetchProducts();
    populateCategoryDropdowns();
  }
  async function fetchCategories() {
    const snapshot = await db.collection('categories').orderBy('categoryName').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  async function fetchProducts() {
    const snapshot = await db.collection('products').orderBy('productId').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  function populateCategoryDropdowns() {
    [productCategorySelect, editProductCategorySelect].forEach(select => {
      select.innerHTML = '<option value="">Select Category</option>';
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.categoryName;
        select.appendChild(option);
      });
    });
  }
  
  // --- Initialization ---
  (async function init() {
    categories = await fetchCategories();
    products = await fetchProducts();
    populateCategoryDropdowns();
    renderDashboardCategories();
    renderProductTable();
    renderCategoryTable();
    renderProductStockTables();
    // Show dashboard by default
    sections.forEach(section => (section.style.display = 'none'));
    document.getElementById('dashboard').style.display = 'block';
    navLinks.forEach(l => l.classList.remove('active'));
    document.querySelector('.nav-link[href="#dashboard"]').classList.add('active');
  })();  


  // --- PURCHASE HISTORY FEATURE ---
const adminPurchaseHistoryTableBody = document.querySelector('#adminPurchaseHistoryTable tbody');
async function fetchAndRenderAdminPurchaseHistory() {
  try {
    const snapshot = await db.collection('purchaseHistory')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    adminPurchaseHistoryTableBody.innerHTML = '';
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
      adminPurchaseHistoryTableBody.appendChild(tr);
    });
  } catch (error) {
    adminPurchaseHistoryTableBody.innerHTML = '<tr><td colspan="6">Failed to load purchase history.</td></tr>';
  }
}

// --- USER REGISTER FEATURE -----------------------------------------------------------------------------
const usersTableBody = document.querySelector('#usersTable tbody');
const userModal = document.getElementById('userModal');
const userModalTitle = document.getElementById('userModalTitle');
const userNickname = document.getElementById('userNickname');
const userFullName = document.getElementById('userFullName');
const userCategory = document.getElementById('userCategory');
const userUsername = document.getElementById('userUsername');
const userPassword = document.getElementById('userPassword');
const saveUserBtn = document.getElementById('saveUserBtn');
const closeUserModalBtn = document.getElementById('closeUserModalBtn');
const addUserBtn = document.getElementById('addUserBtn');

let editingUserId = null;

function openUserModal(edit = false, user = {}) {
  userModalTitle.textContent = edit ? "Edit User" : "Add User";
  userNickname.value = user.nickname || "";
  userFullName.value = user.fullName || "";
  userCategory.value = user.userCategory || "";
  userUsername.value = user.username || "";
  userPassword.value = user.password || "";
  userModal.style.display = 'flex';
  editingUserId = edit ? user.id : null;
}

function closeUserModal() {
  userModal.style.display = 'none';
  editingUserId = null;
}

addUserBtn.addEventListener('click', () => openUserModal(false));
closeUserModalBtn.addEventListener('click', closeUserModal);

saveUserBtn.addEventListener('click', async () => {
  const nickname = userNickname.value.trim();
  const fullName = userFullName.value.trim();
  const category = userCategory.value;
  const username = userUsername.value.trim();
  const password = userPassword.value.trim();

  if (!nickname || !fullName || !category || !username || !password) {
    alert("Please fill in all fields.");
    return;
  }

  if (editingUserId) {
    // Update
    await db.collection('users').doc(editingUserId).update({
      nickname, fullName, userCategory: category, username, password
    });
  } else {
    // Add
    await db.collection('users').add({
      nickname, fullName, userCategory: category, username, password
    });
  }
  closeUserModal();
  fetchAndRenderUsers();
});

async function fetchAndRenderUsers() {
  const snapshot = await db.collection('users').orderBy('nickname').get();
  usersTableBody.innerHTML = '';
  snapshot.forEach(doc => {
    const data = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${data.nickname}</td>
      <td>${data.fullName}</td>
      <td>${data.userCategory}</td>
      <td>${data.username}</td>
      <td>${data.password}</td>
      <td>
        <button class="edit-user-btn" data-id="${doc.id}">Edit</button>
        <button class="delete-user-btn" data-id="${doc.id}">Delete</button>
      </td>
    `;
    usersTableBody.appendChild(tr);
  });
  // Add event listeners for edit and delete
  usersTableBody.querySelectorAll('.edit-user-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const docSnap = await db.collection('users').doc(id).get();
      openUserModal(true, { id, ...docSnap.data() });
    });
  });
  usersTableBody.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm("Are you sure you want to delete this user?")) {
        await db.collection('users').doc(id).delete();
        fetchAndRenderUsers();
      }
    });
  });
}

// --- NAVIGATION: Show correct section and load data ---
navLinks.forEach(link => {
  link.addEventListener('click', e => {
    if (link.id === "logoutBtn") { e.preventDefault(); return; }
    e.preventDefault();
    const sectionId = link.getAttribute('href').substring(1);
    sections.forEach(section => section.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    if (sectionId === "dashboard") renderDashboardCategories();
    if (sectionId === "productstock") renderProductStockTables();
    if (sectionId === "purchaseHistory") fetchAndRenderAdminPurchaseHistory();
    if (sectionId === "userRegister") fetchAndRenderUsers();
  });
});

// --- Modal click outside to close ---
window.addEventListener('click', function(event) {
  if (event.target === userModal) closeUserModal();
});

// --- Initial load ---
document.addEventListener('DOMContentLoaded', () => {
  // Show dashboard by default
  sections.forEach(section => section.style.display = 'none');
  document.getElementById('dashboard').style.display = 'block';
  navLinks.forEach(l => l.classList.remove('active'));
  navLinks[0].classList.add('active');
  // Load dashboard data
  if (typeof renderDashboardCategories === 'function') renderDashboardCategories();
});

//close window
document.getElementById('superadminclose').addEventListener('click', () => {
  window.close();
});
