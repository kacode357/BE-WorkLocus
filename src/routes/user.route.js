// src/routes/user.route.js

// Nạp các module và controller cần thiết.
const express = require("express");
const {
    updateProfileController,
    changePasswordController,
    updateEmployeeBankInfoController,
    getUserPayrollsController
} = require("../controllers/user.controller.js");
const { verifyToken } = require("../middleware/auth.js");

// Khởi tạo router của Express.
const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các route bên dưới.
router.use(verifyToken);

// Các route để người dùng tự quản lý thông tin cá nhân.
router.put("/profile", updateProfileController);
router.put("/change-password", changePasswordController);
router.put("/bank-info", updateEmployeeBankInfoController);
router.post("/payrolls/history", getUserPayrollsController);

// Xuất router để app chính có thể sử dụng.
module.exports = router;