const mongoose = require("mongoose");

const performanceReviewSchema = new mongoose.Schema(
    {
        // Liên kết tới nhân viên được đánh giá
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Tháng và năm của kỳ đánh giá
        month: {
            type: Number, // Sẽ lưu từ 1 đến 12
            required: true,
        },
        year: {
            type: Number, // Sẽ lưu năm, ví dụ: 2025
            required: true,
        },
        // Hạng đánh giá do admin chấm
        grade: {
            type: String,
            enum: ["A", "B", "C", "D"], // Chỉ cho phép 4 giá trị này
            required: true,
        },
        // Ghi chú thêm của admin về kỳ đánh giá này (không bắt buộc)
        notes: { 
            type: String,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

// << PHẦN QUAN TRỌNG >>
// Tạo một index độc nhất (unique) kết hợp 3 trường này.
// Mục đích: Đảm bảo mỗi nhân viên chỉ có MỘT bản ghi đánh giá duy nhất cho MỘT tháng cụ thể.
// Ví dụ: Không thể có 2 record đánh giá cho user "ABC" trong tháng 6/2025.
performanceReviewSchema.index({ user_id: 1, month: 1, year: 1 }, { unique: true });


module.exports = mongoose.model("PerformanceReview", performanceReviewSchema);