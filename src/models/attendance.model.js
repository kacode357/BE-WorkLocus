const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        work_date: { type: Date, required: true },
        morning: {
            check_in_time: { type: Date },
            check_in_latitude: { type: Number },
            check_in_longitude: { type: Number },
            check_out_time: { type: Date },
            check_out_latitude: { type: Number },
            check_out_longitude: { type: Number },
            is_remote_check_in: { type: Boolean, default: false },
            check_in_reason: { type: String, default: null },
            is_remote_check_out: { type: Boolean, default: false },
            check_out_reason: { type: String, default: null },
            total_work_time: { type: String, default: null },
        },
        afternoon: {
            check_in_time: { type: Date },
            check_in_latitude: { type: Number },
            check_in_longitude: { type: Number },
            check_out_time: { type: Date },
            check_out_latitude: { type: Number },
            check_out_longitude: { type: Number },
            is_remote_check_in: { type: Boolean, default: false },
            check_in_reason: { type: String, default: null },
            is_remote_check_out: { type: Boolean, default: false },
            check_out_reason: { type: String, default: null },
            total_work_time: { type: String, default: null },
        },
        tasks_worked_on: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task"
        }],
        is_deleted: { type: Boolean, default: false },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    }
);

attendanceSchema.index({ user_id: 1, work_date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;