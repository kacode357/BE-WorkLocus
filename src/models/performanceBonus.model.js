const mongoose = require("mongoose");

const performanceBonusSchema = new mongoose.Schema(
    {
        // Tên hạng, ví dụ: "A", "B", "S"...
        grade: {
            type: String,
            required: true,
            unique: true, // Mỗi hạng chỉ có 1 mức thưởng
            uppercase: true, // Tự động viết hoa
        },
        // Mức tiền thưởng tương ứng
        bonus_amount: {
            type: Number,
            required: true,
            default: 0,
        },
        description: {
            type: String, // Mô tả thêm nếu cần
        },
        is_active: {
            type: Boolean,
            default: true, // Có thể tắt/bật một mức thưởng
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

module.exports = mongoose.model("PerformanceBonus", performanceBonusSchema);