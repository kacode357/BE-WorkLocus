const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    check_in_time: {
      type: Date,
      required: true,
    },
    check_in_latitude: {
      type: Number,
    },
    check_in_longitude: {
      type: Number,
    },
    check_out_time: {
      type: Date,
    },
    check_out_latitude: {
      type: Number,
    },
    check_out_longitude: {
      type: Number,
    },
    work_date: {
      type: Date,
      required: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

// Index cũng phải cập nhật theo tên trường mới
attendanceSchema.index({ user_id: 1, work_date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);