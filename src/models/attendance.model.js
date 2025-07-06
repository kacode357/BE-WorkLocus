// File: src/models/attendance.model.js
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
        
        // << TRƯỜNG MỚI ĐỂ THAY THẾ WORK REPORT >>
        // Mảng này sẽ chứa ID của tất cả các task mà user đã làm trong ngày chấm công này
        tasks_worked_on: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task"
        }],
        
        is_remote_check_in: {
            type: Boolean,
            default: false
        },
        check_in_reason: {
            type: String,
            default: null
        },
        is_remote_check_out: {
            type: Boolean,
            default: false
        },
        check_out_reason: {
            type: String,
            default: null
        },
        is_deleted: { type: Boolean, default: false },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    }
);

attendanceSchema.index({ user_id: 1, work_date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;