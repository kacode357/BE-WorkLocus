const express = require("express");
const router = express.Router();
const UserController = require("../controllers/user.controller.js");
const { verifyToken } = require("../middleware/auth.js");

// Áp dụng middleware, yêu cầu đăng nhập
router.use(verifyToken);

// Route để người dùng TỰ cập nhật thông tin cá nhân
router.put("/profile", UserController.updateProfileController);

// Route để người dùng TỰ đổi mật khẩu
router.put("/change-password", UserController.changePasswordController);

// Route để người dùng TỰ cập nhật thông tin ngân hàng
router.put("/bank-info", UserController.updateEmployeeBankInfoController);

router.post("/payrolls/search",UserController.getUserPayrollsController);
module.exports = router;