// src/routes/payroll.route.js

// Nạp các module và middleware cần thiết.
const express = require('express');
const PayrollController = require('../controllers/payroll.controller');
const { verifyToken, checkAdmin } = require("../middleware/auth.js");

// Khởi tạo router của Express.
const router = express.Router();

// Áp dụng middleware xác thực và quyền Admin cho tất cả route bên dưới.
router.use(verifyToken, checkAdmin);

// Các route quản lý bảng lương chỉ dành cho Admin.
router.post('/calculate', PayrollController.calculatePayrollController);
router.post('/search', PayrollController.searchPayrollsController);

// Xuất router để app chính có thể sử dụng.
module.exports = router;