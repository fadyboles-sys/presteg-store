const tabs = document.querySelectorAll('.tab');
const contentDiv = document.getElementById('content');

// ===== إدارة التبويبات =====
function loadModule(moduleName) {
  fetch(`src/${moduleName}.html`)
    .then(response => response.text())
    .then(html => {
      contentDiv.innerHTML = html;
      initModule(moduleName);
    });
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    loadModule(tab.id.replace('-tab', ''));
  });
});

// ===== تهيئة الوحدات =====
function initModule(moduleName) {
  switch(moduleName) {
    case 'products':
      initProductsModule();
      break;
    case 'sales':
      initSalesModule();
      break;
    case 'reports':
      initReportsModule();
      break;
  }
}

// ===== إدارة المنتجات =====
function initProductsModule() {
  const productForm = document.getElementById('product-form');
  if (!productForm) return;

  productForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const product = {
      brand: document.getElementById('brand').value,
      name: document.getElementById('name').value,
      costPrice: parseFloat(document.getElementById('cost-price').value),
      sellingPrice: parseFloat(document.getElementById('selling-price').value),
      discount: parseFloat(document.getElementById('discount').value) || 0,
      stock: parseInt(document.getElementById('stock').value),
      supplier: document.getElementById('supplier').value || ''
    };
    
    try {
      const productId = window.api.addProduct(product);
      alert(`تمت إضافة المنتج بنجاح! (ID: ${productId})`);
      productForm.reset();
      loadProductsList();
    } catch (error) {
      alert('حدث خطأ: ' + error.message);
      console.error(error);
    }
  });
  
  loadProductsList();
}

function loadProductsList() {
  const tbody = document.getElementById('products-body');
  if (!tbody) return;
  
  try {
    const products = window.api.getProducts();
    tbody.innerHTML = '';
    
    products.forEach(product => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${product.brand}</td>
        <td>${product.name}</td>
        <td>${product.cost_price.toFixed(2)}</td>
        <td>${product.selling_price.toFixed(2)}</td>
        <td>${product.discount}%</td>
        <td>${product.stock}</td>
        <td>${product.supplier || '-'}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('حدث خطأ في تحميل المنتجات:', error);
  }
}

// ===== إدارة المبيعات =====
function initSalesModule() {
  const saleForm = document.getElementById('sale-form');
  if (!saleForm) return;
  
  const searchInput = document.getElementById('product-search');
  const searchResults = document.getElementById('search-results');
  const selectedProductDiv = document.getElementById('selected-product');
  const addSaleBtn = document.getElementById('add-sale-btn');
  
  let selectedProduct = null;
  
  // البحث عن المنتجات
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim();
    if (term.length < 1) {
      searchResults.style.display = 'none';
      return;
    }
    
    try {
      const products = window.api.getProducts();
      const filtered = products.filter(p => 
        p.brand.includes(term) || p.name.includes(term)
      );
      
      displaySearchResults(filtered);
    } catch (error) {
      console.error('بحث فاشل:', error);
    }
  });
  
  function displaySearchResults(products) {
    searchResults.innerHTML = '';
    products.forEach(p => {
      const div = document.createElement('div');
      div.className = 'search-result-item';
      div.textContent = `${p.brand} - ${p.name} (${p.stock} متبقي)`;
      div.onclick = () => selectProduct(p);
      searchResults.appendChild(div);
    });
    searchResults.style.display = 'block';
  }
  
  function selectProduct(product) {
    selectedProduct = product;
    document.getElementById('selected-product-name').textContent = product.name;
    document.getElementById('selected-product-brand').textContent = product.brand;
    document.getElementById('selected-product-price').textContent = product.selling_price.toFixed(2);
    document.getElementById('selected-product-discount').textContent = product.discount;
    document.getElementById('selected-product-stock').textContent = product.stock;
    selectedProductDiv.style.display = 'block';
    addSaleBtn.disabled = false;
    searchResults.style.display = 'none';
    searchInput.value = '';
  }
  
  // تسجيل البيع
  saleForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      alert('اختر منتج أولاً');
      return;
    }
    
    const sale = {
      productId: selectedProduct.id,
      quantity: parseInt(document.getElementById('quantity').value),
      discountApplied: parseFloat(document.getElementById('discount-applied').value) || 0,
      salePrice: selectedProduct.selling_price
    };
    
    try {
      window.api.addSale(sale);
      alert('تم تسجيل البيع بنجاح!');
      saleForm.reset();
      selectedProductDiv.style.display = 'none';
      addSaleBtn.disabled = true;
      selectedProduct = null;
      loadTodaySales();
    } catch (error) {
      alert('خطأ في تسجيل البيع: ' + error.message);
    }
  });
  
  loadTodaySales();
}

function loadTodaySales() {
  const tbody = document.getElementById('sales-table').querySelector('tbody');
  if (!tbody) return;
  
  try {
    const sales = window.api.getTodaySales();
    tbody.innerHTML = '';
    
    sales.forEach(sale => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${sale.product_name} (${sale.brand})</td>
        <td>${sale.quantity}</td>
        <td>${sale.sale_price.toFixed(2)}</td>
        <td>${sale.discount_applied.toFixed(2)}</td>
        <td>${(sale.quantity * sale.sale_price - sale.discount_applied).toFixed(2)}</td>
        <td>${new Date(sale.sale_date).toLocaleTimeString()}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('خطأ في تحميل المبيعات:', error);
  }
}

// ===== إدارة التقارير =====
function initReportsModule() {
  const generateBtn = document.getElementById('generate-report');
  if (generateBtn) {
    generateBtn.addEventListener('click', generateReport);
  }
  
  generateReport(); // توليد تقرير اليوم افتراضياً
}

function generateReport() {
  const dateInput = document.getElementById('report-date');
  const date = dateInput.value || new Date().toISOString().split('T')[0];
  
  try {
    // التقرير اليومي
    const report = window.api.getDailyReport();
    if (report) {
      document.getElementById('total-sales').textContent = report.total_sales.toFixed(2) + ' ر.س';
      document.getElementById('total-profit').textContent = report.total_profit.toFixed(2) + ' ر.س';
      document.getElementById('items-sold').textContent = report.items_sold;
      document.getElementById('remaining-stock').textContent = report.remaining_stock;
    } else {
      // إذا لم يكن هناك تقرير لهذا اليوم، نعرض أصفار
      document.getElementById('total-sales').textContent = '0.00 ر.س';
      document.getElementById('total-profit').textContent = '0.00 ر.س';
      document.getElementById('items-sold').textContent = '0';
      document.getElementById('remaining-stock').textContent = '0';
    }
    
    // تفاصيل المبيعات اليومية
    const sales = window.api.getTodaySales();
    const tbody = document.getElementById('detailed-sales').querySelector('tbody');
    tbody.innerHTML = '';
    
    sales.forEach(sale => {
      // حساب الربح لكل عملية بيع
      const profit = (sale.sale_price - sale.cost_price) * sale.quantity - sale.discount_applied;
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${sale.product_name}</td>
        <td>${sale.quantity}</td>
        <td>${sale.sale_price.toFixed(2)}</td>
        <td>${sale.discount_applied.toFixed(2)}</td>
        <td>${(sale.quantity * sale.sale_price - sale.discount_applied).toFixed(2)}</td>
        <td>${profit.toFixed(2)}</td>
      `;
      tbody.appendChild(row);
    });
    
    // إحصائيات إضافية
    updateSummaryStats(sales);
  } catch (error) {
    console.error('خطأ في توليد التقرير:', error);
  }
}

function updateSummaryStats(sales) {
  if (sales.length === 0) {
    document.getElementById('top-product').textContent = '-';
    document.getElementById('top-brand').textContent = '-';
    document.getElementById('avg-price').textContent = '0.00 ر.س';
    document.getElementById('total-discount').textContent = '0.00 ر.س';
    return;
  }
  
  // أعلى منتج مبيعاً
  const productsMap = {};
  sales.forEach(sale => {
    productsMap[sale.product_name] = (productsMap[sale.product_name] || 0) + sale.quantity;
  });
  
  const topProduct = Object.entries(productsMap)
    .sort((a, b) => b[1] - a[1])[0][0];
  document.getElementById('top-product').textContent = topProduct;
  
  // أفضل براند
  const brandsMap = {};
  sales.forEach(sale => {
    brandsMap[sale.brand] = (brandsMap[sale.brand] || 0) + sale.quantity;
  });
  
  const topBrand = Object.entries(brandsMap)
    .sort((a, b) => b[1] - a[1])[0][0];
  document.getElementById('top-brand').textContent = topBrand;
  
  // متوسط سعر البيع
  const totalSales = sales.reduce((sum, sale) => sum + (sale.quantity * sale.sale_price), 0);
  const totalItems = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const avgPrice = totalSales / totalItems;
  document.getElementById('avg-price').textContent = avgPrice.toFixed(2) + ' ر.س';
  
  // إجمالي الخصومات
  const totalDiscount = sales.reduce((sum, sale) => sum + sale.discount_applied, 0);
  document.getElementById('total-discount').textContent = totalDiscount.toFixed(2) + ' ر.س';
}

// بدء التشغيل: تحميل واجهة المنتجات عند البدء
document.addEventListener('DOMContentLoaded', () => {
  loadModule('products');
});