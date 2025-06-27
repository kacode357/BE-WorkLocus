// File: routes/performanceReview.route.js

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/performanceReview.controller');
const { verifyToken, checkAdmin } = require("../middleware/auth.js");

// --- CÁC ROUTE CHO PERFORMANCE REVIEW ---

router.post('/', verifyToken, checkAdmin, reviewController.createOrUpdateReviewController);

// Method: GET /api/reviews
router.get('/', verifyToken, checkAdmin, reviewController.getReviewsController);

module.exports = router;