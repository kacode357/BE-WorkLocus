const mongoose = require("mongoose");

const workplaceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            default: "Trụ sở chính", // Tên địa điểm, ví dụ trụ sở, chi nhánh...
        },
        latitude: {
            type: Number,
            required: [true, "Vĩ độ (latitude) là bắt buộc."],
        },
        longitude: {
            type: Number,
            required: [true, "Kinh độ (longitude) là bắt buộc."],
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

// Chỉ có một địa điểm mặc định, nên không cần index phức tạp
module.exports = mongoose.model("Workplace", workplaceSchema);