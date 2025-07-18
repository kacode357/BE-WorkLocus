// src/routes/project.route.js

// Nạp các module và middleware cần thiết.
const express = require("express");
const ProjectController = require("../controllers/project.controller.js");
const { verifyToken, checkAdminOrPM, checkProjectManagerOrAdmin } = require("../middleware/auth.js");

// Khởi tạo router của Express.
const router = express.Router();

// === CÁC ROUTE MỌI NHÂN VIÊN ĐÃ ĐĂNG NHẬP ĐỀU CÓ THỂ DÙNG ===
router.post("/search", verifyToken, ProjectController.searchProjectsController);
router.patch("/:id/join", verifyToken, ProjectController.joinProjectController);
router.patch("/:id/leave", verifyToken, ProjectController.leaveProjectController);

// === ROUTE CHỈ DÀNH CHO ADMIN HOẶC PM BẤT KỲ ===
router.post("/", [verifyToken, checkAdminOrPM], ProjectController.createProjectController);

// === ROUTE CHỈ DÀNH CHO ADMIN HOẶC PM CỦA DỰ ÁN ĐÓ ===
router.put("/:id", [verifyToken, checkProjectManagerOrAdmin], ProjectController.updateProjectController);
router.patch("/:id/complete", [verifyToken, checkProjectManagerOrAdmin], ProjectController.completeProjectController);
router.delete("/:id", [verifyToken, checkProjectManagerOrAdmin], ProjectController.softDeleteProjectController);
router.delete("/:projectId/members/:userId", [verifyToken, checkProjectManagerOrAdmin], ProjectController.removeMemberFromProjectController);

// Xuất router để app chính có thể sử dụng.
module.exports = router;