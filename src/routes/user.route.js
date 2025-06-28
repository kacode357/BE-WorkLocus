const express = require("express");
const router = express.Router();
const UserController = require("../controllers/user.controller.js");
const { verifyToken } = require("../middleware/auth.js");

// Áp dụng middleware cho tất cả, yêu cầu đăng nhập
router.use(verifyToken);

// << ROUTE MỚI: Lấy thông tin chi tiết của user đang đăng nhập >>
router.get("/profile", UserController.getUserProfileController);

// Route để người dùng tự cập nhật thông tin cá nhân (họ tên, ảnh)
router.put("/profile", UserController.updateProfileController);

// Route để người dùng tự đổi mật khẩu
router.put("/change-password", UserController.changePasswordController);

// << ROUTE CẬP NHẬT BANK ĐÃ SỬA LẠI CHO AN TOÀN >>
// User tự cập nhật thông tin bank của chính mình
router.put("/bank-info", UserController.updateEmployeeBankInfoController);

module.exports = router;