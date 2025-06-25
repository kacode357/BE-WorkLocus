const express = require("express");
const router = express.Router();
const AttendanceController = require("../controllers/attendance.controller.js");
const { verifyToken } = require("../middleware/auth.js");

// API MỚI: Để kiểm tra trạng thái check-in hiện tại của nhân viên
router.get("/status", verifyToken, AttendanceController.getAttendanceStatusController);

// API để nhân viên thực hiện check-in
router.post("/check-in", verifyToken, AttendanceController.checkInController);

// API để nhân viên thực hiện check-out
router.post("/check-out", verifyToken, AttendanceController.checkOutController);

// API để nhân viên tự xem lịch sử điểm danh của mình
router.post("/history", verifyToken, AttendanceController.getMyAttendanceHistoryController);

module.exports = router;
