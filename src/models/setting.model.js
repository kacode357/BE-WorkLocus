// File: src/models/setting.model.js
const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema({
    is_maintenance_mode: {
        type: Boolean,
        required: true,
        default: false,
    },
    maintenance_message: {
        type: String,
        default: "Hệ thống đang được bảo trì. Vui lòng quay lại sau.",
    },
    // << THÊM TRƯỜNG MỚI >>
    min_app_version: {
        type: String, // Lưu dạng '1.0.0'
        required: true,
        default: '1.0.0',
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model("Setting", settingSchema);