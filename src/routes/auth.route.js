// src/routes/auth.route.js

// Nạp các module và controller cần thiết.
const express = require("express");
const AuthController = require("../controllers/auth.controller.js");
const { verifyToken } = require("../middleware/auth.js");

// Khởi tạo router của Express.
const router = express.Router();

// Nhóm các route công khai không yêu cầu xác thực.
router.post("/register", AuthController.registerUserController);
router.post("/login", AuthController.loginController);
router.get("/verify/:userId/:token", AuthController.verifyEmailController);
router.post("/refresh-token", AuthController.refreshTokenController);
router.post("/forgot-password", AuthController.forgotPasswordController);
router.post("/reset-password", AuthController.resetPasswordController);

// Nhóm các route yêu cầu xác thực bằng token.
router.get("/me", verifyToken, AuthController.getMeController);

// Route đặc biệt chỉ dùng cho mục đích phát triển.
router.get("/setup-initial-admin-for-dev-only", AuthController.createInitialAdminController);

// Xuất router để app chính có thể sử dụng.
module.exports = router;