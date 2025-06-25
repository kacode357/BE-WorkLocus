const express = require("express");
const router = express.Router();
const UserController = require("../controllers/user.controller.js");
const { verifyToken } = require("../middleware/auth.js");

// Áp dụng middleware cho tất cả route, yêu cầu người dùng phải đăng nhập
router.use(verifyToken);

// Route để người dùng tự cập nhật thông tin cá nhân
router.put("/profile", UserController.updateProfileController);

// Route để người dùng tự đổi mật khẩu
router.put("/change-password", UserController.changePasswordController);

module.exports = router;
