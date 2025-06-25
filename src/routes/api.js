// File: src/routes/api.js (PHIÊN BẢN MỚI DÙNG ROUTER)

const express = require('express');
const router = express.Router(); // Dùng Router của Express, đây là cách làm đúng chuẩn

// --- IMPORT CÁC FILE ROUTE CON ---
const CheckApi = require("./checkapi.route");
const authRoutes = require("./auth.route");
const userRoutes = require("./user.route");
const adminRoutes = require("./admin.route");
const attendanceRoutes = require("./attendance.route");
const workReportRoutes = require("./workReport.route");

/**
 * Gán các route con vào router chính.
 * Không cần hàm initRoute(app) nữa.
 * Mọi thứ giờ được đóng gói trong cái 'router' này.
 */
router.use("", CheckApi);
router.use("/api/auth", authRoutes);
router.use("/api/users", userRoutes);
router.use("/api/admin", adminRoutes);
router.use("/api/attendances", attendanceRoutes);
router.use("/api/work-reports", workReportRoutes);

// Export cái router đã được cấu hình ra ngoài
module.exports = router;