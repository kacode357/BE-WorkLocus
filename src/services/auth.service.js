const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Token = require("../models/token.model");
const sendEmail = require("../utils/sendEmail");
const { AUTH_MESSAGES, GENERAL_MESSAGES } = require("../constants/auth.messages");

const generateTokens = (user) => {
    const payload = { id: user._id, role: user.role, email: user.email };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES });
    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRES });
    return { accessToken, refreshToken };
};

const registerUserService = async ({ full_name, email, password }) => {
    try {
        if (!full_name || !email || !password) {
            return { status: 400, ok: false, message: AUTH_MESSAGES.REGISTER_INFO_MISSING };
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return { status: 409, ok: false, message: AUTH_MESSAGES.EMAIL_ALREADY_EXISTS };
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = await User.create({ full_name, email, password: hashedPassword });

        const verificationToken = crypto.randomBytes(32).toString("hex");
        await new Token({ user_id: newUser._id, token: verificationToken }).save();

        const verificationLink = `${process.env.BASE_URL}/api/auth/verify/${newUser._id}/${verificationToken}`;
        const emailSubject = "Kích hoạt tài khoản WorkLocus của bạn";
        const emailContent = `<h2>Chào mừng ${newUser.full_name}!</h2><p>Vui lòng nhấn vào đường link bên dưới để kích hoạt tài khoản của bạn (link có hiệu lực trong 10 phút):</p><a href="${verificationLink}">Kích hoạt ngay</a>`;
        await sendEmail(newUser.email, emailSubject, emailContent);

        return { status: 201, ok: true, message: AUTH_MESSAGES.REGISTER_SUCCESS, data: null };
    } catch (error) {
        console.error("ERROR in registerUserService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const verifyEmailService = async ({ userId, token }) => {
    try {
        if (!userId || !token) {
            return { status: 400, ok: false, message: AUTH_MESSAGES.VERIFY_INFO_MISSING };
        }
        const user = await User.findById(userId);
        if (!user) {
            return { status: 404, ok: false, message: AUTH_MESSAGES.USER_NOT_FOUND };
        }
        if (user.is_activated) {
            return { status: 200, ok: true, message: AUTH_MESSAGES.ALREADY_ACTIVATED };
        }
        const tokenDoc = await Token.findOne({ user_id: user._id, token });
        if (!tokenDoc) {
            return { status: 400, ok: false, message: AUTH_MESSAGES.INVALID_VERIFY_LINK };
        }
        await User.updateOne({ _id: user._id }, { $set: { is_activated: true } });
        await Token.findByIdAndDelete(tokenDoc._id);
        return { status: 200, ok: true, message: AUTH_MESSAGES.VERIFY_SUCCESS };
    } catch (error) {
        console.error("ERROR in verifyEmailService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const loginUserService = async ({ email, password }) => {
    try {
        if (!email || !password) {
            return { status: 400, ok: false, message: AUTH_MESSAGES.LOGIN_INFO_MISSING };
        }
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return { status: 401, ok: false, message: AUTH_MESSAGES.LOGIN_INCORRECT };
        }
        if (!user.is_activated) {
            return { status: 403, ok: false, message: AUTH_MESSAGES.LOGIN_NOT_ACTIVATED };
        }
        const { accessToken, refreshToken } = generateTokens(user);
        user.refresh_token = refreshToken;
        await user.save();
        return { status: 200, ok: true, message: AUTH_MESSAGES.LOGIN_SUCCESS, data: { accessToken, refreshToken } };
    } catch (error) {
        console.error("ERROR in loginUserService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const refreshTokenService = async (refreshTokenFromClient) => {
    try {
        if (!refreshTokenFromClient) {
            return { status: 401, ok: false, message: AUTH_MESSAGES.REFRESH_TOKEN_REQUIRED };
        }
        const decoded = jwt.verify(refreshTokenFromClient, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || user.refresh_token !== refreshTokenFromClient) {
            return { status: 403, ok: false, message: AUTH_MESSAGES.REFRESH_TOKEN_INVALID };
        }
        const { accessToken } = generateTokens(user);
        return { status: 200, ok: true, message: AUTH_MESSAGES.REFRESH_SUCCESS, data: { accessToken } };
    } catch (error) {
        console.error("ERROR in refreshTokenService:", error);
        return { status: 403, ok: false, message: AUTH_MESSAGES.REFRESH_TOKEN_INVALID };
    }
};

const getMeService = async ({ userFromToken }) => {
    try {
        return { status: 200, ok: true, message: AUTH_MESSAGES.GET_ME_SUCCESS, data: userFromToken };
    } catch (error) {
        console.error("ERROR in getMeService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const forgotPasswordService = async ({ email }) => {
    try {
        if (!email) {
            return { status: 400, ok: false, message: AUTH_MESSAGES.FORGOT_PASSWORD_EMAIL_MISSING };
        }
        const user = await User.findOne({ email });
        if (user) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            await new Token({ user_id: user._id, token: otp }).save();
            const emailSubject = "Mã xác nhận đặt lại mật khẩu WorkLocus";
            const emailContent = `<h2>Xin chào ${user.full_name},</h2><p>Mã xác nhận của bạn là:</p><h1 style="color: blue; letter-spacing: 5px;">${otp}</h1><p>Mã này có hiệu lực trong 10 phút.</p>`;
            await sendEmail(user.email, emailSubject, emailContent);
        }
        return { status: 200, ok: true, message: AUTH_MESSAGES.FORGOT_PASSWORD_SUCCESS };
    } catch (error) {
        console.error("ERROR in forgotPasswordService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const resetPasswordService = async ({ email, otp, newPassword }) => {
    try {
        if (!email || !otp || !newPassword) {
            return { status: 400, ok: false, message: AUTH_MESSAGES.RESET_PASSWORD_INFO_MISSING };
        }
        const user = await User.findOne({ email });
        if (!user) {
            return { status: 400, ok: false, message: AUTH_MESSAGES.OTP_INVALID };
        }
        const tokenDoc = await Token.findOne({ user_id: user._id, token: otp });
        if (!tokenDoc) {
            return { status: 400, ok: false, message: AUTH_MESSAGES.OTP_INVALID };
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        await Token.findByIdAndDelete(tokenDoc._id);
        return { status: 200, ok: true, message: AUTH_MESSAGES.RESET_PASSWORD_SUCCESS };
    } catch (error) {
        console.error("ERROR in resetPasswordService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const createInitialAdminService = async () => {
    try {
        // Lấy thông tin admin từ biến môi trường
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            return {
                status: 400,
                ok: false,
                message: "Thiếu biến môi trường ADMIN_EMAIL hoặc ADMIN_PASSWORD để tạo admin ban đầu.",
            };
        }

        // Tạo tên đầy đủ cho admin, có thể là phần trước @ của email
        const full_name = adminEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim(); // Loại bỏ ký tự đặc biệt, giữ lại chữ và số

        const adminData = {
            full_name: full_name || "Super Admin", // Dùng full_name từ email hoặc mặc định
            email: adminEmail,
            password: adminPassword, // Đây là mật khẩu plaintext từ .env
        };

        const existingAdmin = await User.findOne({ email: adminData.email });
        if (existingAdmin) {
            return {
                status: 409,
                ok: false,
                message: AUTH_MESSAGES.INITIAL_ADMIN_ALREADY_EXISTS(adminData.email),
            };
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminData.password, salt); // Hash mật khẩu trước khi lưu

        const newAdmin = await User.create({
            ...adminData,
            password: hashedPassword,
            role: "admin",
            is_activated: true,
        });

        // Gửi email thông báo tài khoản admin
        const emailSubject = "Tài khoản Admin WorkLocus của bạn đã được tạo!";
        const emailContent = `
            <h2>Chào mừng ${newAdmin.full_name},</h2>
            <p>Tài khoản quản trị viên của bạn trên WorkLocus đã được thiết lập thành công.</p>
            <p>Dưới đây là thông tin đăng nhập của bạn (vui lòng thay đổi mật khẩu sau khi đăng nhập lần đầu):</p>
            <ul>
                <li><strong>Email:</strong> ${adminData.email}</li>
                <li><strong>Mật khẩu:</strong> ${adminData.password}</li>
            </ul>
            <p>Trân trọng,</p>
            <p>Đội ngũ WorkLocus</p>
        `;
        await sendEmail(adminData.email, emailSubject, emailContent);

        const adminResponse = newAdmin.toObject();
        delete adminResponse.password; // Không trả về mật khẩu đã hash trong response

        return {
            status: 201,
            ok: true,
            message: AUTH_MESSAGES.INITIAL_ADMIN_SUCCESS,
            data: adminResponse,
        };
    } catch (error) {
        console.error("ERROR in createInitialAdminService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

module.exports = {
    registerUserService,
    verifyEmailService,
    loginUserService,
    refreshTokenService,
    getMeService,
    forgotPasswordService,
    resetPasswordService,
    createInitialAdminService,
};
