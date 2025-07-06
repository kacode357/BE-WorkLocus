const mongoose = require("mongoose");

const performanceBonusSchema = new mongoose.Schema(
    {
        grade: {
            type: String,
            required: true,
            uppercase: true,
            unique: true, 
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

// << BỎ ĐI INDEX CŨ >>
// performanceBonusSchema.index( ... ); // Bỏ dòng này đi nếu có

module.exports = mongoose.model("PerformanceBonus", performanceBonusSchema);