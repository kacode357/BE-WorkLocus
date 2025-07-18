// src/routes/task.route.js

// Nạp các module và middleware cần thiết.
const express = require("express");
const TaskController = require("../controllers/task.controller.js");
const { verifyToken, checkTaskCreationPermission, checkTaskCompletionPermission, checkTaskManagementPermission } = require("../middleware/auth.js");

// Khởi tạo router của Express.
const router = express.Router();

// Các route dành cho mọi nhân viên đã đăng nhập.
router.post("/search", verifyToken, TaskController.searchAvailableTasksController);
router.patch("/:id/join", verifyToken, TaskController.joinTaskController);

// Route yêu cầu quyền tạo task.
router.post("/", [verifyToken, checkTaskCreationPermission], TaskController.createTaskController);

// Route yêu cầu quyền cập nhật và xóa task.
router.put("/:id", [verifyToken, checkTaskManagementPermission], TaskController.updateTaskController);
router.delete("/:id", [verifyToken, checkTaskManagementPermission], TaskController.softDeleteTaskController);

// Route yêu cầu quyền hoàn thành task.
router.patch("/:id/complete", [verifyToken, checkTaskCompletionPermission], TaskController.completeTaskController);

// Xuất router để app chính có thể sử dụng.
module.exports = router;