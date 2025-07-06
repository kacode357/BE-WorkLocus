// src/constants/admin.messages.js

const ADMIN_MESSAGES = {
    // Quản lý người dùng
    USER_NOT_FOUND: "Không tìm thấy người dùng.",
    CANNOT_PERFORM_ACTION_ON_SELF: "Admin không thể thực hiện hành động này trên chính mình.",
    PROJECT_ID_REQUIRED: "Mã dự án là bắt buộc.",
    INVALID_PROJECT_ID: "Mã dự án không hợp lệ.",
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
    // << THÊM MỚI >>
    CREATE_PM_SUCCESS: "Tạo tài khoản Project Manager thành công.",
    CREATE_TL_SUCCESS: "Tạo tài khoản Team Leader thành công.",

    // Tìm kiếm & Lấy dữ liệu
    SEARCH_SUCCESS: "Lấy danh sách thành công.",
    KEYWORD_NOT_FOUND: "Không tìm thấy kết quả nào khớp với từ khóa.",
    GET_EMPLOYEE_DETAILS_SUCCESS: "Lấy thông tin chi tiết nhân viên thành công.",
    GET_DASHBOARD_STATS_SUCCESS: "Lấy thống kê dashboard thành công.",

    // << THÊM MỚI: Quản lý lương >>
    UPDATE_SALARY_SUCCESS: "Cập nhật lương cơ bản thành công.",

    // << THÊM MỚI: Quản lý địa điểm >>
    WORKPLACE_INFO_REQUIRED: "Tên, vĩ độ và kinh độ là bắt buộc.",
    WORKPLACE_INVALID_COORDINATES: "Định dạng vĩ độ hoặc kinh độ không hợp lệ.",
    UPDATE_WORKPLACE_SUCCESS: "Cập nhật địa điểm làm việc thành công.",
    GET_WORKPLACE_SUCCESS: "Lấy thông tin địa điểm làm việc thành công.",
    WORKPLACE_NOT_SET: "Chưa có địa điểm làm việc nào được thiết lập.",

    // << THÊM MỚI: Nội dung Email >>
    EMAIL_SUBJECTS: {
        ACCOUNT_BLOCKED: "Thông báo: Tài khoản của bạn đã bị khóa",
        ACCOUNT_UNBLOCKED: "Thông báo: Tài khoản của bạn đã được mở khóa",
    },
    EMAIL_CONTENT: {
        accountBlocked: (fullName, reason) => `<h2>Xin chào ${fullName},</h2><p>Tài khoản của bạn tại WorkLocus đã bị khóa bởi quản trị viên.</p><p><strong>Lý do:</strong> ${reason}</p><p>Vui lòng liên hệ bộ phận hỗ trợ nếu bạn có câu hỏi.</p>`,
        accountUnblocked: (fullName) => `<h2>Xin chào ${fullName},</h2><p>Tài khoản của bạn tại WorkLocus đã được kích hoạt trở lại. Bây giờ bạn có thể đăng nhập.</p>`,
    },
    PROJECT_NOT_FOUND: "Không tìm thấy dự án.",
    USER_TO_ADD_NOT_FOUND: "Không tìm thấy người dùng bạn muốn thêm.",
    ADD_MEMBER_ALREADY_EXISTS: (email, projectName) => `Người dùng ${email} đã là thành viên của dự án ${projectName}.`,
    CANNOT_ADD_ADMIN_AS_MEMBER: "Không thể thêm một Admin khác làm thành viên dự án.",
    ADD_MEMBER_SUCCESS: (email, projectName) => `Thêm người dùng ${email} vào dự án ${projectName} thành công.`,
};

module.exports = {
    ADMIN_MESSAGES,
};