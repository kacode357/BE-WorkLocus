// src/routes/admin.route.js

// Nạp các module và middleware cần thiết.
const express = require("express");
const AdminController = require("../controllers/admin.controller.js");
const { verifyToken, checkAdmin, checkAdminOrPM } = require("../middleware/auth.js");

// Khởi tạo router của Express.
const router = express.Router();

// Các route yêu cầu quyền Admin hoặc Project Manager (PM).
router.post("/users/search", [verifyToken, checkAdminOrPM], AdminController.searchUsersController);
router.post("/tasks/search", [verifyToken, checkAdminOrPM], AdminController.searchAllTasksController);
router.post("/attendances/search", [verifyToken, checkAdminOrPM], AdminController.searchAllAttendancesController);
router.post("/projects/search", [verifyToken, checkAdminOrPM], AdminController.searchAllProjectsController);
router.post("/projects/:projectId/add-member", [verifyToken, checkAdminOrPM], AdminController.addMemberToProjectController);
router.post("/projects/:projectId/members/search", [verifyToken, checkAdminOrPM], AdminController.searchProjectMembersController);

// Các route chỉ dành riêng cho Admin.
// -- Quản lý hệ thống & Dashboard
router.get("/dashboard-stats", [verifyToken, checkAdmin], AdminController.getDashboardStatsController);
router.patch("/maintenance-mode", [verifyToken, checkAdmin], AdminController.updateMaintenanceModeController);
router.post("/dashboard/project-stats", [verifyToken, checkAdmin], AdminController.getProjectTaskStatsController);
router.post("/dashboard/employee-avg-hours", [verifyToken, checkAdmin], AdminController.getEmployeeAverageHoursController);
router.post("/dashboard/projects-health", [verifyToken, checkAdmin], AdminController.getProjectsHealthDashboardController);
router.get(
    "/users/:id/attendance-summary",
    [verifyToken, checkAdmin], // hoặc checkAdminOrPM nếu muốn PM dùng được
    AdminController.getUserAttendanceSummaryController
);
// -- Quản lý người dùng (Users)
router.get("/users/:id", [verifyToken, checkAdmin], AdminController.getEmployeeDetailsByIdController);
router.patch("/users/:id/block", [verifyToken, checkAdmin], AdminController.blockUserController);
router.patch("/users/:id/unblock", [verifyToken, checkAdmin], AdminController.unblockUserController);
router.patch("/users/:id/role", [verifyToken, checkAdmin], AdminController.updateUserRoleController);
router.patch("/users/:id/change-password", [verifyToken, checkAdmin], AdminController.adminChangePasswordController);
router.put("/users/:id/salary", [verifyToken, checkAdmin], AdminController.updateEmployeeSalaryController);
router.delete("/users/:id", [verifyToken, checkAdmin], AdminController.softDeleteUserController);
// -- Tạo tài khoản mới
router.post("/create-admin", [verifyToken, checkAdmin], AdminController.createAdminAccountController);
router.post("/create-pm", [verifyToken, checkAdmin], AdminController.createPMByAdminController);
router.post("/create-tl", [verifyToken, checkAdmin], AdminController.createTLByAdminController);
router.post("/create-employee", [verifyToken, checkAdmin], AdminController.createEmployeeByAdminController);
// -- Quản lý địa điểm làm việc (Workplaces)
router.post("/workplaces", [verifyToken, checkAdmin], AdminController.createWorkplaceController);
router.patch("/workplaces/:id", [verifyToken, checkAdmin], AdminController.updateWorkplaceByIdController);
router.delete("/workplaces/:id", [verifyToken, checkAdmin], AdminController.deleteWorkplaceController);

// Các route công khai (cân nhắc kỹ về bảo mật).
router.get("/settings", AdminController.getSystemSettingsController);
router.post("/workplaces/search", AdminController.searchWorkplacesController);

// Xuất router để app chính có thể sử dụng.
module.exports = router;