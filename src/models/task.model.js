// File: src/models/task.model.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const taskSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
        },
        project_id: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },
        parent_id: {
            type: Schema.Types.ObjectId,
            ref: "Task",
            default: null,
        },
        assignee_id: { // << THAY ĐỔI Ở ĐÂY >>
            type: Schema.Types.ObjectId,
            ref: "User",
            required: false, // Không bắt buộc nữa
            default: null,   // Mặc định là null (chưa ai nhận)
        },
        reporter_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ['todo', 'in_progress', 'done', 'blocked'],
            default: 'todo',
        },
        due_date: {
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

taskSchema.index({ project_id: 1, assignee_id: 1 });
taskSchema.index({ parent_id: 1 });

module.exports = mongoose.model("Task", taskSchema);