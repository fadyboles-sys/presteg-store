const Database = require('better-sqlite3');
const path = require('path');

// مسار قاعدة البيانات في المجلد الرئيسي
const dbPath = path.join(__dirname, 'clothing-store.db');
const db = new Database(dbPath, { verbose: console.log });

// إنشاء الجداول
db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  cost_price REAL NOT NULL,
  selling_price REAL NOT NULL,
  discount REAL DEFAULT 0,
  stock INTEGER NOT NULL,
  supplier TEXT,
  added_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  sale_price REAL NOT NULL,
  discount_applied REAL DEFAULT 0,
  sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_date DATE UNIQUE NOT NULL,
  total_sales REAL DEFAULT 0,
  total_profit REAL DEFAULT 0,
  items_sold INTEGER DEFAULT 0,
  new_stock_added INTEGER DEFAULT 0,
  remaining_stock INTEGER DEFAULT 0
);
`);

// ===== وظائف إدارة المنتجات =====
const addProduct = (product) => {
  const stmt = db.prepare(`
    INSERT INTO products (brand, name, cost_price, selling_price, discount, stock, supplier) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  return stmt.run(
    product.brand,
    product.name,
    product.costPrice,
    product.sellingPrice,
    product.discount,
    product.stock,
    product.supplier
  ).lastInsertRowid;
};

const getProducts = () => {
  return db.prepare("SELECT * FROM products").all();
};

// ===== وظائف إدارة المبيعات =====
const addSale = (sale) => {
  // بدء المعاملة
  const transaction = db.transaction(() => {
    // تحديث المخزون
    db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?")
      .run(sale.quantity, sale.productId);
    
    // تسجيل عملية البيع
    db.prepare(`
      INSERT INTO sales (product_id, quantity, sale_price, discount_applied) 
      VALUES (?, ?, ?, ?)
    `).run(
      sale.productId,
      sale.quantity,
      sale.salePrice,
      sale.discountApplied
    );
    
    // تحديث التقرير اليومي
    updateDailyReport();
  });
  
  transaction();
};

// ===== وظائف التقارير =====
const updateDailyReport = () => {
  const today = new Date().toISOString().split('T')[0];
  
  // حساب إجمالي المبيعات
  const salesData = db.prepare(`
    SELECT 
      SUM(s.quantity * s.sale_price - s.discount_applied) AS total_sales,
      SUM(s.quantity) AS items_sold,
      SUM((s.sale_price - p.cost_price) * s.quantity - s.discount_applied) AS total_profit
    FROM sales s
    JOIN products p ON s.product_id = p.id
    WHERE date(s.sale_date) = ?
  `).get(today);
  
  // حساب المخزون المتبقي
  const stockData = db.prepare('SELECT SUM(stock) AS remaining_stock FROM products').get();
  
  // إضافة/تحديث التقرير اليومي
  db.prepare(`
    INSERT OR REPLACE INTO daily_reports 
    (report_date, total_sales, total_profit, items_sold, remaining_stock)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    today,
    salesData.total_sales || 0,
    salesData.total_profit || 0,
    salesData.items_sold || 0,
    stockData.remaining_stock || 0
  );
};

const getDailyReport = () => {
  const today = new Date().toISOString().split('T')[0];
  return db.prepare('SELECT * FROM daily_reports WHERE report_date = ?').get(today);
};

const getMonthlyReport = (month, year) => {
  return db.prepare(`
    SELECT 
      strftime('%d', report_date) AS day,
      SUM(total_sales) AS daily_sales,
      SUM(total_profit) AS daily_profit
    FROM daily_reports
    WHERE strftime('%m', report_date) = ? AND strftime('%Y', report_date) = ?
    GROUP BY report_date
  `).all(month.toString().padStart(2, '0'), year);
};

// ===== تصدير الوظائف =====
module.exports = {
  db,
  addProduct,
  getProducts,
  addSale,
  updateDailyReport,
  getDailyReport,
  getMonthlyReport
};