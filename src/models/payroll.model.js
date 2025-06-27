const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
    {
        // Liên kết tới nhân viên nhận lương
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Tháng và năm của kỳ lương
        month: { type: Number, required: true },
        year: { type: Number, required: true },
        
        // ---- Dữ liệu đầu vào tại thời điểm tính lương ----
        // Việc lưu lại các thông số này đảm bảo tính chính xác của lịch sử
        working_days: { 
            type: Number, 
            required: true 
        }, // Tổng ngày công trong tháng
        base_salary_per_day: { 
            type: Number, 
            required: true 
        }, // Đơn giá lương tại thời điểm tính

        // ---- Chi tiết các khoản lương và thưởng ----
        base_salary: { 
            type: Number, 
            required: true 
        }, // Lương cơ bản = working_days * base_salary_per_day
        diligence_bonus: { 
            type: Number, 
            default: 0 
        }, // Thưởng chuyên cần
        performance_bonus: { 
            type: Number, 
            default: 0 
        }, // Thưởng hiệu quả
        other_bonus: { 
            type: Number, 
            default: 0 
        }, // Thưởng khác (nhập tay)
        
        // << LƯƠNG THỰC LÃNH CUỐI CÙNG >>
        total_salary: { 
            type: Number, 
            required: true 
        },

        // Trạng thái thanh toán của bảng lương này
        status: {
            type: String,
            enum: ['pending', 'paid', 'failed'], // Chờ thanh toán, Đã thanh toán, Thất bại
            default: 'pending',
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

// Tương tự, đảm bảo mỗi nhân viên chỉ có 1 bảng lương duy nhất cho mỗi tháng
payrollSchema.index({ user_id: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("Payroll", payrollSchema);