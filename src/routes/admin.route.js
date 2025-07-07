// src/routes/admin.route.js
const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/admin.controller.js");
const { verifyToken, checkAdmin } = require("../middleware/auth.js");

router.get("/settings", AdminController.getSystemSettingsController);

router.post("/workplaces/search" ,AdminController.searchWorkplacesController);
// Áp dụng middleware cho TẤT CẢ các route trong file này
router.use(verifyToken, checkAdmin);

// === Route quản lý hệ thống ===
router.patch("/maintenance-mode", AdminController.updateMaintenanceModeController);

// === Các route quản lý người dùng ===
router.post("/users/search", AdminController.searchUsersController); 
router.patch("/users/:id/block", AdminController.blockUserController); 
router.patch("/users/:id/unblock", AdminController.unblockUserController);
router.patch("/users/:id/change-password", AdminController.adminChangePasswordController);
router.delete("/users/:id", AdminController.softDeleteUserController);
router.get("/users/:id", AdminController.getEmployeeDetailsByIdController);
router.patch("/users/:id/role", AdminController.updateUserRoleController);

// === Các route tạo tài khoản ===
router.post("/create-admin", AdminController.createAdminAccountController);
router.post("/create-employee", AdminController.createEmployeeByAdminController);
router.post("/create-pm", AdminController.createPMByAdminController);
router.post("/create-tl", AdminController.createTLByAdminController); 

// === Route quản lý lương & địa điểm ===
router.put("/users/:id/salary", AdminController.updateEmployeeSalaryController);


router.post("/workplaces", AdminController.createWorkplaceController); // Tạo mới
router.patch("/workplaces/:id", AdminController.updateWorkplaceByIdController); // Sửa (dùng PATCH hợp lý hơn)
router.delete("/workplaces/:id", AdminController.deleteWorkplaceController); 

// === Các route tìm kiếm/báo cáo & dashboard ===
router.post("/attendances/search", AdminController.searchAllAttendancesController);
// router.post("/work-reports/search", AdminController.searchWorkReportsController);
router.post("/projects/search", AdminController.searchAllProjectsController);
router.post("/tasks/search", AdminController.searchAllTasksController);
router.get("/dashboard-stats", AdminController.getDashboardStatsController);

// === Các route quản lý Project (Admin) ===
router.post("/projects/:projectId/add-member", AdminController.addMemberToProjectController);
router.post("/projects/:projectId/members/search", AdminController.searchProjectMembersController); 
module.exports = router;