const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');

// Sửa lại import và dùng middleware của mày
const { verifyToken, checkAdmin } = require("../middleware/auth.js");

// --- CÁC ROUTE CHO PAYROLL (VIẾT NGANG) ---

// Method: POST /api/payroll/calculate
router.post('/calculate', verifyToken, checkAdmin, payrollController.calculatePayrollController);

// Method: GET /api/payroll
router.get('/', verifyToken, checkAdmin, payrollController.getPayrollsController);

module.exports = router;