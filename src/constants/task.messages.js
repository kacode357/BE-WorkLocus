// File: src/constants/task.messages.js
const TASK_MESSAGES = {
    CREATE_SUCCESS: "Tạo công việc mới thành công.",
    MISSING_INFO: "Vui lòng cung cấp tên, project_id và assignee_id.",
    PROJECT_NOT_FOUND: "Dự án được chỉ định không tồn tại.",
    ASSIGNEE_NOT_FOUND: "Người được giao việc không tồn tại hoặc không phải là thành viên của dự án.",
    PARENT_TASK_NOT_FOUND: "Công việc cha không tồn tại.",
    PARENT_TASK_MISMATCH: "Công việc cha không thuộc về dự án này.",
    GET_AVAILABLE_TASKS_SUCCESS: "Lấy danh sách công việc có thể nhận thành công.",
    
};

module.exports = {
    TASK_MESSAGES,
};