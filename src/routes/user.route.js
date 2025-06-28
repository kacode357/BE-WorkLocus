const express = require("express");
const router = express.Router();
// --- CẬP NHẬT IMPORT ---
const { 
    updateProfileController, 
    changePasswordController, 
    updateEmployeeBankInfoController,
    getUserPayrollsController // << IMPORT CONTROLLER MỚI
} = require("../controllers/user.controller.js");
const { verifyToken } = require("../middleware/auth.js");

// Áp dụng middleware, tất cả các route bên dưới đều yêu cầu đăng nhập
router.use(verifyToken);

// Route để người dùng TỰ cập nhật thông tin cá nhân
router.put("/profile", updateProfileController);

// Route để người dùng TỰ đổi mật khẩu
router.put("/change-password", changePasswordController);

// Route để người dùng TỰ cập nhật thông tin ngân hàng
router.put("/bank-info", updateEmployeeBankInfoController);

// --- THÊM MỚI ---
// Route để người dùng TỰ lấy lịch sử lương của mình (có tìm kiếm và phân trang)
router.post("/payrolls/history", getUserPayrollsController);


module.exports = router;