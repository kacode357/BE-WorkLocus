// File: src/constants/project.messages.js
const PROJECT_MESSAGES = {
    CREATE_SUCCESS: "Tạo dự án mới thành công.",
    MISSING_INFO: "Vui lòng cung cấp tên và mô tả cho dự án.",
    MANAGER_ROLE_INVALID: "Chỉ Admin hoặc Project Manager mới có thể tạo dự án.",
    GET_PROJECTS_SUCCESS: "Lấy danh sách dự án thành công.",
    CANNOT_REMOVE_MANAGER: "Không thể xóa người quản lý ra khỏi dự án.",
    MEMBER_NOT_FOUND_IN_PROJECT: "Người dùng này không phải là thành viên của dự án.",
    REMOVE_MEMBER_SUCCESS: "Xóa thành viên khỏi dự án thành công.",
};

module.exports = {
    PROJECT_MESSAGES,
};