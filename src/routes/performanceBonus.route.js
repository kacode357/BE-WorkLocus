// src/routes/performanceBonus.route.js

// Nạp các module và middleware cần thiết.
const express = require('express');
const BonusController = require('../controllers/performanceBonus.controller.js');
const { verifyToken, checkAdmin } = require('../middleware/auth.js');

// Khởi tạo router của Express.
const router = express.Router();

// Áp dụng middleware xác thực và quyền Admin cho tất cả route bên dưới.
router.use(verifyToken, checkAdmin);

// Các route CRUD quản lý thưởng hiệu suất.
router.post('/search', BonusController.searchBonuses);
router.post('/', BonusController.createBonus);
router.patch('/:id', BonusController.updateBonus);
router.delete('/:id', BonusController.softDeleteBonus);

// Xuất router để app chính có thể sử dụng.
module.exports = router;