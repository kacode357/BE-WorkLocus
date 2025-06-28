const UserService = require("../services/user.service.js");
const { GENERAL_MESSAGES } = require("../constants/user.messages.js");

const handleRequest = async (serviceCall, res) => {
    try {
        const result = await serviceCall();
        return res.status(result.status).json(result);
    } catch (error) {
        console.error("ERROR in controller:", error);
        return res.status(500).json({
            status: 500,
            ok: false,
            message: GENERAL_MESSAGES.SYSTEM_ERROR,
        });
    }
};

const updateProfileController = (req, res) => {
    // Lấy userId từ req.user do middleware gắn vào
    const userId = req.user._id;
    const updateData = req.body;
    handleRequest(() => UserService.updateProfileService({ userId, updateData }), res);
};

const changePasswordController = (req, res) => {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;
    handleRequest(() => UserService.changePasswordService({ userId, currentPassword, newPassword }), res);
};
const updateEmployeeBankInfoController = (req, res) => {
    handleRequest(() => UserService.updateEmployeeBankInfoService({
        userIdToUpdate: req.user._id, // << LẤY ID TỪ TOKEN, KHÔNG DÙNG PARAMS
        bankData: req.body,
    }), res);
};
const getUserProfileController = (req, res) => {
    handleRequest(() => UserService.getUserProfileService({
        userId: req.user._id // Luôn lấy ID của người dùng đã đăng nhập
    }), res);
};
module.exports = {
    updateProfileController,
    changePasswordController,
    updateEmployeeBankInfoController,
    getUserProfileController,
};
