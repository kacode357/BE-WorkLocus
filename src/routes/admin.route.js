const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/admin.controller.js");
const { verifyToken, checkAdmin } = require("../middleware/auth.js");

// Áp dụng middleware cho TẤT CẢ các route trong file này
// Bất kỳ request nào vào /api/admin/... đều phải qua 2 lớp kiểm tra này
router.use(verifyToken, checkAdmin);

// === Các route quản lý người dùng ===
router.post("/users/search", AdminController.searchUsersController); 
router.patch("/users/:id/block", AdminController.blockUserController); 
router.patch("/users/:id/unblock", AdminController.unblockUserController);
router.patch("/users/:id/change-password", AdminController.adminChangePasswordController);
router.delete("/users/:id", AdminController.softDeleteUserController);
router.post("/create-admin", AdminController.createAdminAccountController);
router.post("/create-employee", AdminController.createEmployeeByAdminController);

router.put("/users/:id/salary", AdminController.updateEmployeeSalaryController);
router.get("/users/:id", AdminController.getEmployeeDetailsByIdController);
// === Các route tìm kiếm/báo cáo ===
router.post("/attendances/search", AdminController.searchAllAttendancesController);
router.post("/work-reports/search", AdminController.searchWorkReportsController);

// === Route mới cho dashboard stats ===
router.get("/dashboard-stats", AdminController.getDashboardStatsController);
router.put("/workplace", AdminController.updateWorkplaceLocationController);
router.get("/workplace", AdminController.getWorkplaceLocationController);
module.exports = router;