// File: src/constants/auth.messages.js

const AUTH_MESSAGES = {
    // Đăng ký
    REGISTER_INFO_MISSING: "Vui lòng điền đầy đủ họ tên, email và mật khẩu.",
    EMAIL_ALREADY_EXISTS: "Email này đã được sử dụng.",
    REGISTER_SUCCESS: "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.",

    // Xác thực Email
    VERIFY_INFO_MISSING: "Thiếu thông tin user ID hoặc token.",
    USER_NOT_FOUND: "Người dùng không tồn tại.",
    ALREADY_ACTIVATED: "Tài khoản này đã được kích hoạt từ trước.",
    INVALID_VERIFY_LINK: "Link không hợp lệ hoặc đã hết hạn.",
    VERIFY_SUCCESS: "Tài khoản đã được kích hoạt thành công!",

    // Đăng nhập
    LOGIN_INFO_MISSING: "Vui lòng nhập email và mật khẩu.",
    LOGIN_INCORRECT: "Email hoặc mật khẩu không chính xác.",
    LOGIN_NOT_ACTIVATED: "Tài khoản của bạn chưa được kích hoạt hoặc bị khóa.",
    LOGIN_SUCCESS: "Đăng nhập thành công!",

    // Refresh Token
    REFRESH_TOKEN_REQUIRED: "Yêu cầu Refresh Token.",
    REFRESH_TOKEN_INVALID: "Refresh Token không hợp lệ.",
    REFRESH_SUCCESS: "Làm mới token thành công.",
    
    // Quên/Đặt lại mật khẩu
    FORGOT_PASSWORD_EMAIL_MISSING: "Vui lòng nhập email của bạn.",
    FORGOT_PASSWORD_SUCCESS: "Nếu email của bạn tồn tại trong hệ thống, chúng tôi đã gửi một mã xác nhận để đặt lại mật khẩu.",
    RESET_PASSWORD_INFO_MISSING: "Vui lòng cung cấp đầy đủ email, mã OTP và mật khẩu mới.",
    OTP_INVALID: "Mã OTP không hợp lệ hoặc đã hết hạn.",
    RESET_PASSWORD_SUCCESS: "Đặt lại mật khẩu thành công!",

    // Lấy thông tin user
    GET_ME_SUCCESS: "Lấy thông tin người dùng thành công.",

    // Admin ban đầu
    INITIAL_ADMIN_ALREADY_EXISTS: (email) => `Tài khoản admin với email ${email} đã tồn tại.`,
    INITIAL_ADMIN_SUCCESS: "Tạo tài khoản admin ban đầu thành công!",
};

// Các thông báo chung
const GENERAL_MESSAGES = {
    SYSTEM_ERROR: "Lỗi hệ thống, vui lòng thử lại sau.",
    // Bạn có thể thêm các lỗi chung khác ở đây
};


module.exports = {
    AUTH_MESSAGES,
    GENERAL_MESSAGES,
};

