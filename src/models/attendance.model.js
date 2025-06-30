const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        check_in_time: { type: Date, required: true },
        check_in_latitude: { type: Number },
        check_in_longitude: { type: Number },
        check_out_time: { type: Date },
        check_out_latitude: { type: Number },
        check_out_longitude: { type: Number },
        work_date: { type: Date, required: true },
        total_work_time: { type: String, default: null },
        
        // <<< --- CÁC TRƯỜNG MỚI, ĐƠN GIẢN HƠN --- >>>
        is_remote: { // Đánh dấu đây là một lần chấm công từ xa
            type: Boolean,
            default: false
        },
        request_reason: { // Lưu lý do chấm công từ xa để sau này xem lại
            type: String,
            default: null
        },
        // <<< --- ĐÃ BỎ CÁC TRƯỜNG status, rejection_reason, processed_by --- >>>
        
        is_deleted: { type: Boolean, default: false },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    }
);

attendanceSchema.index({ user_id: 1, work_date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);