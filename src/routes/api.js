// File: src/routes/api.js

const express = require('express');
const router = express.Router();

// --- IMPORT CÁC FILE ROUTE CON ---
const CheckApi = require("./checkapi.route");
const authRoutes = require("./auth.route");
const userRoutes = require("./user.route");
const adminRoutes = require("./admin.route");
const attendanceRoutes = require("./attendance.route");
// const workReportRoutes = require("./workReport.route");
const performanceReviewRoutes = require("./performanceReview.route");
const payrollRoutes = require("./payroll.route");
const performanceBonusRoutes = require("./performanceBonus.route");
const projectRoutes = require("./project.route");
const taskRoutes = require("./task.route");

router.use("", CheckApi);
router.use("/api/auth", authRoutes);
router.use("/api/users", userRoutes);
router.use("/api/admin", adminRoutes);
router.use("/api/attendances", attendanceRoutes);
// router.use("/api/work-reports", workReportRoutes);
router.use("/api/reviews", performanceReviewRoutes);
router.use("/api/payroll", payrollRoutes);
router.use("/api/bonuses", performanceBonusRoutes);
router.use("/api/projects", projectRoutes); 
router.use("/api/tasks", taskRoutes);

// Export cái router đã được cấu hình ra ngoài
module.exports = router;