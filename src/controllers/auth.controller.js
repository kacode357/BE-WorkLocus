const AuthService = require("../services/auth.service");
const { GENERAL_MESSAGES } = require("../constants/auth.messages");

const handleRequest = async (serviceCall, res) => {
    try {
        // Thực thi hàm service được truyền vào
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

// --- Định nghĩa các Controller ---

const registerUserController = (req, res) => {
    handleRequest(() => AuthService.registerUserService(req.body), res);
};

const loginController = (req, res) => {
    handleRequest(() => AuthService.loginUserService(req.body), res);
};

const refreshTokenController = (req, res) => {
    handleRequest(() => AuthService.refreshTokenService(req.body.refreshToken), res);
};

const getMeController = (req, res) => {
    // Service này cần dữ liệu từ req.user do middleware gắn vào
    handleRequest(() => AuthService.getMeService({ userFromToken: req.user }), res);
};

const forgotPasswordController = (req, res) => {
    handleRequest(() => AuthService.forgotPasswordService(req.body), res);
};

const resetPasswordController = (req, res) => {
    handleRequest(() => AuthService.resetPasswordService(req.body), res);
};

const createInitialAdminController = (req, res) => {
    handleRequest(() => AuthService.createInitialAdminService(), res);
};

// Controller này có logic trả về đặc biệt (redirect hoặc HTML) nên được xử lý riêng.
const verifyEmailController = async (req, res) => {
    try {
        const { userId, token } = req.params;
        const result = await AuthService.verifyEmailService({ userId, token });

        if (result.status === 200) {
            // Sửa lại URL cho đúng, không chứa cú pháp Markdown
            return res.redirect("https://hoanghamobile.com/tin-tuc/wp-content/uploads/2024/11/tai-hinh-nen-dep-mien-phi.jpg");
        }

        return res.status(result.status).send(`<h1>${result.message}</h1>`);
    } catch (error) {
        console.error("ERROR in verifyEmailController:", error);
        return res.status(500).json({
            status: 500,
            ok: false,
            message: GENERAL_MESSAGES.SYSTEM_ERROR,
        });
    }
};


module.exports = {
    registerUserController,
    verifyEmailController,
    createInitialAdminController,
    loginController,
    refreshTokenController,
    getMeController,
    forgotPasswordController,
    resetPasswordController,
};
