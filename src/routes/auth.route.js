const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/auth.controller.js");
const { verifyToken, checkAdmin } = require("../middleware/auth.js");

// Public Routes - Các route không cần xác thực
router.post("/register", AuthController.registerUserController);
router.get("/verify/:userId/:token", AuthController.verifyEmailController);
router.post("/login", AuthController.loginController);
router.post("/refresh-token", AuthController.refreshTokenController);
router.post("/forgot-password", AuthController.forgotPasswordController);
router.post("/reset-password", AuthController.resetPasswordController);

// Protected Routes - Các route yêu cầu xác thực và phân quyền
router.get("/me", verifyToken, AuthController.getMeController)

// Development-Only Routes - Các route chỉ dùng khi phát triển
// CẢNH BÁO: Route này rất nguy hiểm, chỉ dùng để setup admin ban đầu.
router.get("/setup-initial-admin-account-for-dev-only", AuthController.createInitialAdminController);

module.exports = router;