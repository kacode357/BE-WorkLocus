const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["employee", "admin", "project_manager", "team_leader"],
      required: true,
      default: "employee",
    },
    base_salary_per_day: {
      type: Number,
      required: true,
      default: 0,
    },
    image_url: {
      type: String,
      default: null,
    },
    bank_name: {
      type: String,
      default: null,
    },
    bank_account_number: {
      type: String,
      default: null,
    },
    is_activated: {
      type: Boolean,
      default: false,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    refresh_token: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

module.exports = mongoose.model("User", userSchema);
