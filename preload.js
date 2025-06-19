const { contextBridge } = require('electron')
const database = require('./database')

contextBridge.exposeInMainWorld('api', {
  // وظائف المنتجات
  addProduct: (product) => database.addProduct(product),
  getProducts: () => database.getProducts(),
  
  // وظائف المبيعات
  addSale: (sale) => database.addSale(sale),
  getTodaySales: () => {
    const today = new Date().toISOString().split('T')[0];
    return database.db.prepare(`
      SELECT s.*, p.brand, p.name AS product_name 
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE date(s.sale_date) = ?
    `).all(today);
  },
  
  // وظائف التقارير
  getDailyReport: () => database.getDailyReport(),
  getMonthlyReport: (month, year) => database.getMonthlyReport(month, year)
})