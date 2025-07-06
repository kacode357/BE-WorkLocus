// File: src/services/task.service.js
const Task = require("../models/task.model.js");
const Project = require("../models/project.model.js");
// Bỏ User đi vì không cần check assignee nữa
const { TASK_MESSAGES } = require("../constants/task.messages.js");
const { GENERAL_MESSAGES } = require("../constants/auth.messages.js");

const updateTaskService = async ({ taskId, updateData }) => {
    try {
        const forbiddenFields = ['project_id', 'parent_id', 'reporter_id', 'is_deleted'];
        forbiddenFields.forEach(field => delete updateData[field]);
        
        // Logic kiểm tra đặc biệt
        if (updateData.status && updateData.status === 'done') {
            return { status: 400, ok: false, message: "Vui lòng dùng endpoint /:id/complete để hoàn thành công việc." };
        }
        
        const task = await Task.findById(taskId);
        if (!task) {
            return { status: 404, ok: false, message: "Không tìm thấy công việc." };
        }
        
        // Nếu có gán lại assignee, phải check xem assignee mới có trong project không
        if (updateData.assignee_id && updateData.assignee_id !== task.assignee_id?.toString()) {
            const project = await Project.findById(task.project_id);
            const isNewAssigneeMember = project.members.includes(updateData.assignee_id) || project.manager_id.equals(updateData.assignee_id);
            if (!isNewAssigneeMember) {
                return { status: 400, ok: false, message: "Không thể gán việc cho người không thuộc dự án." };
            }
        }

        // Cập nhật các trường
        Object.assign(task, updateData);
        await task.save();

        return { status: 200, ok: true, message: "Cập nhật công việc thành công.", data: task };

    } catch (error) {
        console.error("ERROR in updateTaskService:", error);
        if (error.name === 'ValidationError') {
            return { status: 400, ok: false, message: error.message };
        }
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const softDeleteTaskService = async ({ taskId }) => {
    try {
        const task = await Task.findById(taskId);
        if (!task || task.is_deleted) {
            return { status: 404, ok: false, message: "Không tìm thấy công việc." };
        }

        // Kiểm tra nếu task này có con không
        const subTaskCount = await Task.countDocuments({
            parent_id: taskId,
            is_deleted: false
        });

        if (subTaskCount > 0) {
            return { status: 400, ok: false, message: `Không thể xóa công việc này vì nó chứa ${subTaskCount} công việc con.` };
        }

        task.is_deleted = true;
        await task.save();

        return { status: 200, ok: true, message: "Xóa công việc thành công." };

    } catch (error) {
        console.error("ERROR in softDeleteTaskService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const completeTaskService = async ({ taskId }) => {
    try {
        const task = await Task.findById(taskId);
        if (!task) {
            return { status: 404, ok: false, message: "Không tìm thấy công việc." };
        }
        if (task.status === 'done') {
            return { status: 409, ok: false, message: "Công việc này đã hoàn thành trước đó." };
        }

        // KIỂM TRA DEPENDENCY
        const unfinishedSubTaskCount = await Task.countDocuments({
            parent_id: taskId,
            status: { $ne: 'done' }
        });

        if (unfinishedSubTaskCount > 0) {
            return { status: 400, ok: false, message: `Không thể hoàn thành. Còn ${unfinishedSubTaskCount} việc con chưa xong.` };
        }

        task.status = 'done';
        await task.save();

        return { status: 200, ok: true, message: "Công việc đã được đánh dấu hoàn thành.", data: task };

    } catch (error) {
        console.error("ERROR in completeTaskService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const searchAvailableTasksService = async ({ user, searchCondition, pageInfo }) => {
    try {
        const { project_id, keyword } = searchCondition || {};

        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        // Bước 1: Tìm tất cả các project ID mà user này là thành viên hoặc quản lý
        const userProjects = await Project.find({
            $or: [{ manager_id: user._id }, { members: user._id }]
        }).select('_id');

        const userProjectIds = userProjects.map(p => p._id);

        if (userProjectIds.length === 0) {
            // Nếu user không thuộc dự án nào, trả về mảng rỗng
            return {
                status: 200, ok: true, message: TASK_MESSAGES.GET_AVAILABLE_TASKS_SUCCESS,
                data: { records: [], pagination: { currentPage: 1, totalPages: 0, totalRecords: 0 } }
            };
        }

        // Bước 2: Xây dựng điều kiện tìm task
        const queryConditions = {
            assignee_id: null, // Chỉ lấy task chưa có ai nhận
            is_deleted: { $ne: true },
            project_id: { $in: userProjectIds } // Task phải thuộc các dự án của user
        };

        // Thêm các điều kiện search phụ nếu có
        if (project_id) {
            // Nếu user muốn lọc theo 1 project cụ thể
            queryConditions.project_id = project_id;
        }
        if (keyword) {
            queryConditions.name = { $regex: keyword, $options: 'i' };
        }

        const totalRecords = await Task.countDocuments(queryConditions);
        const tasks = await Task.find(queryConditions)
            .populate('project_id', 'name type') // Lấy thêm thông tin của project
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        return {
            status: 200, ok: true, message: TASK_MESSAGES.GET_AVAILABLE_TASKS_SUCCESS,
            data: {
                records: tasks,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalRecords / limit),
                    totalRecords,
                },
            },
        };

    } catch (error) {
        console.error("ERROR in searchAvailableTasksService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const joinTaskService = async ({ taskId, user }) => {
    try {
        const task = await Task.findById(taskId);

        // Check 1: Task có tồn tại không?
        if (!task) {
            return { status: 404, ok: false, message: "Không tìm thấy công việc." };
        }

        // Check 2: Task đã có người nhận chưa?
        if (task.assignee_id) {
            return { status: 409, ok: false, message: "Công việc này đã có người khác nhận." };
        }

        // Check 3: User có thuộc dự án của task này không?
        const project = await Project.findById(task.project_id);
        const isUserInProject = project.manager_id.equals(user._id) || project.members.includes(user._id);
        if (!isUserInProject) {
            return { status: 403, ok: false, message: "Bạn phải là thành viên của dự án mới có thể nhận việc." };
        }

        // Nếu ổn, gán việc cho user và đổi trạng thái
        task.assignee_id = user._id;
        task.status = 'in_progress'; // Tự động chuyển sang 'đang làm'
        await task.save();

        return { status: 200, ok: true, message: "Nhận việc thành công.", data: task };

    } catch (error) {
        console.error("ERROR in joinTaskService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const createTaskService = async ({ taskData, reporter }) => {
    try {
        // Bỏ assignee_id ra khỏi các trường lấy từ taskData
        const { name, description, project_id, parent_id, status, due_date } = taskData;

        // 1. Kiểm tra thông tin bắt buộc (chỉ còn name và project_id)
        if (!name || !project_id) {
            return { status: 400, ok: false, message: "Vui lòng cung cấp tên và project_id cho công việc." };
        }

        // 2. Bỏ bước kiểm tra assignee, chỉ cần check Project tồn tại
        const project = await Project.findById(project_id);
        if (!project) {
            return { status: 404, ok: false, message: TASK_MESSAGES.PROJECT_NOT_FOUND };
        }

        // 3. Logic xử lý SUB-TASK vẫn giữ nguyên
        if (parent_id) {
            const parentTask = await Task.findById(parent_id);
            if (!parentTask) {
                return { status: 404, ok: false, message: TASK_MESSAGES.PARENT_TASK_NOT_FOUND };
            }
            if (parentTask.project_id.toString() !== project_id) {
                return { status: 400, ok: false, message: TASK_MESSAGES.PARENT_TASK_MISMATCH };
            }
        }

        // 4. Tạo task mới (không có assignee_id)
        const newTask = await Task.create({
            name,
            description,
            project_id,
            parent_id,
            // assignee_id sẽ tự động là null theo default của model
            reporter_id: reporter._id,
            status,
            due_date,
        });

        return { status: 201, ok: true, message: TASK_MESSAGES.CREATE_SUCCESS, data: newTask };

    } catch (error) {
        console.error("ERROR in createTaskService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

module.exports = {
    updateTaskService,
    searchAvailableTasksService,
    joinTaskService,
    createTaskService,
    completeTaskService,
    softDeleteTaskService
};