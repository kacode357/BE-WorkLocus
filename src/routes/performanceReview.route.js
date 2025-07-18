// src/routes/performanceReview.route.js

// Nạp các module và middleware cần thiết.
const express = require('express');
const ReviewController = require('../controllers/performanceReview.controller');
const { verifyToken, checkAdmin } = require("../middleware/auth.js");

// Khởi tạo router của Express.
const router = express.Router();

// Áp dụng middleware xác thực và quyền Admin cho tất cả route bên dưới.
router.use(verifyToken, checkAdmin);

// Các route quản lý đánh giá hiệu suất.
router.post('/', ReviewController.createOrUpdateReviewController);
router.get('/', ReviewController.getReviewsController);

// Xuất router để app chính có thể sử dụng.
module.exports = router;