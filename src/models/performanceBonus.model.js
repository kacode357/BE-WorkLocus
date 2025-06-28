const mongoose = require("mongoose");

const performanceBonusSchema = new mongoose.Schema(
    {
        grade: {
            type: String,
            required: true,
            uppercase: true,
            // << BỎ unique: true ở đây >>
        },
        bonus_amount: {
            type: Number,
            required: true,
            default: 0,
        },
        description: {
            type: String,
        },
        is_active: {
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

// << THÊM INDEX MỚI Ở ĐÂY >>
// Tạo một Partial Unique Index
// Nó chỉ bắt lỗi trùng lặp (unique) trên trường 'grade'
// đối với các document có is_active: true
performanceBonusSchema.index(
    { grade: 1 }, 
    { unique: true, partialFilterExpression: { is_active: true } }
);


module.exports = mongoose.model("PerformanceBonus", performanceBonusSchema);