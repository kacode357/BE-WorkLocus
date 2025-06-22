const mongoose = require("mongoose");

const workReportSchema = new mongoose.Schema(
  {
    attendance_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    work_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkType",
      required: true,
    },
    description: {
      type: String,
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

module.exports = mongoose.model("WorkReport", workReportSchema);