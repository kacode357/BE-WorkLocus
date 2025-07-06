// File: src/models/project.model.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const projectSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        // << THÊM TRƯỜNG MỚI VÀO ĐÂY >>
        type: {
            type: String,
            enum: ['public', 'private'], // Chỉ cho phép 2 giá trị này
            required: true,
            default: 'private', // Mặc định là private cho an toàn
        },
        manager_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        members: [{
            type: Schema.Types.ObjectId,
            ref: "User",
        }],
        status: {
            type: String,
            enum: ['planning', 'in_progress', 'completed', 'on_hold'],
            default: 'planning',
        },
        start_date: {
            type: Date,
        },
        end_date: {
            type: Date,
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

module.exports = mongoose.model("Project", projectSchema);