const ADMIN_MESSAGES = {
    // Quản lý người dùng
    USER_NOT_FOUND: "Không tìm thấy người dùng.",
    CANNOT_PERFORM_ACTION_ON_SELF: "Admin không thể thực hiện hành động này trên chính mình.",
    
    // Khóa tài khoản
    BLOCK_REASON_REQUIRED: "Vui lòng cung cấp lý do khóa tài khoản.",
    BLOCK_SUCCESS: (email) => `Đã khóa tài khoản ${email} thành công.`,
    
    // Mở khóa tài khoản
    UNBLOCK_SUCCESS: (email) => `Đã mở khóa tài khoản ${email} thành công.`,

    // Xóa tài khoản
    DELETE_SUCCESS: "Xóa tài khoản thành công.",

    // Đổi mật khẩu
    CHANGE_PASSWORD_NEW_PASS_REQUIRED: "Vui lòng cung cấp mật khẩu mới.",
    CHANGE_PASSWORD_SUCCESS: (email) => `Đã đổi mật khẩu cho tài khoản ${email} thành công.`,

    // Tạo tài khoản
    CREATE_USER_INFO_MISSING: "Vui lòng điền đầy đủ họ tên, email và mật khẩu.",
    EMAIL_ALREADY_EXISTS: "Email này đã được sử dụng.",
    CREATE_ADMIN_SUCCESS: "Tạo tài khoản admin mới thành công.",
    CREATE_EMPLOYEE_SUCCESS: "Tạo tài khoản nhân viên mới thành công.",

    // Tìm kiếm
    SEARCH_SUCCESS: "Lấy danh sách thành công.",
    KEYWORD_NOT_FOUND: "Không tìm thấy kết quả nào khớp với từ khóa.",
};

module.exports = {
    ADMIN_MESSAGES,
};