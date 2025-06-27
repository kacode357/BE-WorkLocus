// File: constants/payroll.messages.js

const PAYROLL_MESSAGES = {
    CALCULATION_SUCCESS: "Tính lương và lưu bảng lương thành công.",
    CALCULATION_FAILED: "Tính lương thất bại.",
    INFO_MISSING: "Thiếu các tham số cần thiết để tính lương.",
    GET_PAYROLLS_SUCCESS: "Lấy lịch sử bảng lương thành công.",
    REVIEW_NOT_FOUND: (month, year) => `Nhân viên chưa được đánh giá hiệu quả trong tháng ${month}/${year}. Vui lòng đánh giá trước.`,
};

module.exports = {
    PAYROLL_MESSAGES,
};