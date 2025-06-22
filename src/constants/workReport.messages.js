const WORK_REPORT_MESSAGES = {
    // Tạo báo cáo
    CREATE_INFO_MISSING: "Vui lòng cung cấp tên công việc và mô tả.",
    MUST_CHECK_IN_FIRST: "Bạn phải check-in trong ngày hôm nay trước khi gửi báo cáo.",
    CANNOT_REPORT_AFTER_CHECK_OUT: "Bạn không thể gửi báo cáo sau khi đã check-out.",
    INVALID_WORK_TYPE: "Loại công việc không hợp lệ.",
    CREATE_SUCCESS: "Gửi báo cáo công việc thành công.",

    // Lấy báo cáo
    GET_TODAY_REPORTS_SUCCESS: "Lấy danh sách báo cáo trong ngày thành công.",

    // Cập nhật báo cáo
    UPDATE_NOT_FOUND: "Không tìm thấy báo cáo hoặc bạn không có quyền chỉnh sửa.",
    CANNOT_UPDATE_AFTER_CHECK_OUT: "Không thể chỉnh sửa báo cáo sau khi đã check-out.",
    UPDATE_SUCCESS: "Cập nhật báo cáo thành công.",

    // Xóa báo cáo
    DELETE_NOT_FOUND: "Không tìm thấy báo cáo hoặc bạn không có quyền xóa.",
    CANNOT_DELETE_AFTER_CHECK_OUT: "Không thể xóa báo cáo sau khi đã check-out.",
    DELETE_SUCCESS: "Xóa báo cáo thành công.",
};

module.exports = {
    WORK_REPORT_MESSAGES,
};