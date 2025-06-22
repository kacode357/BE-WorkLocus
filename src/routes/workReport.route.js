const express = require("express");
const router = express.Router();
const WorkReportController = require("../controllers/workReport.controller");
const { verifyToken } = require("../middleware/auth.js");

// Tất cả route này đều do nhân viên thực hiện và cần đăng nhập
router.use(verifyToken);

// Gửi một báo cáo công việc mới
router.post("/", WorkReportController.createWorkReportController);

// Lấy danh sách các báo cáo đã gửi trong ngày
router.get("/today", WorkReportController.getMyTodaysReportsController);

// Sửa một báo cáo công việc đã gửi
router.put("/:id", WorkReportController.updateWorkReportController);

// Xóa một báo cáo công việc đã gửi
router.delete("/:id", WorkReportController.deleteWorkReportController);

module.exports = router;