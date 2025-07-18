// src/routes/attendance.route.js

// Nạp các module và middleware cần thiết.
const express = require("express");
const AttendanceController = require("../controllers/attendance.controller.js");
const { verifyToken } = require("../middleware/auth.js");

// Khởi tạo router của Express.
const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các route bên dưới.
router.use(verifyToken);

// Các route cho nhân viên tự quản lý việc điểm danh.
router.get("/status", AttendanceController.getAttendanceStatusController);
router.post("/check-in", AttendanceController.checkInController);
router.post("/check-out", AttendanceController.checkOutController);
router.post("/history", AttendanceController.getMyAttendanceHistoryController);

// Xuất router để app chính có thể sử dụng.
module.exports = router;