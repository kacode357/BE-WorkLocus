const Task = require("../models/task.model.js");
const Project = require("../models/project.model.js");
const Attendance = require("../models/attendance.model.js");
const { TASK_MESSAGES } = require("../constants/task.messages.js");
const { GENERAL_MESSAGES } = require("../constants/auth.messages.js");

const updateTaskService = async ({ taskId, updateData }) => {
    try {
        const forbiddenFields = ['project_id', 'parent_id', 'reporter_id', 'is_deleted'];
        forbiddenFields.forEach(field => delete updateData[field]);
        
        if (updateData.status && updateData.status === 'done') {
            return { status: 400, ok: false, message: "Vui lòng dùng endpoint /:id/complete để hoàn thành công việc." };
        }
        
        const task = await Task.findById(taskId);
        if (!task) {
            return { status: 404, ok: false, message: "Không tìm thấy công việc." };
        }
        
        if (updateData.assignee_id && updateData.assignee_id !== task.assignee_id?.toString()) {
            const project = await Project.findById(task.project_id);
            const isNewAssigneeMember = project.members.includes(updateData.assignee_id) || project.manager_id.equals(updateData.assignee_id);
            if (!isNewAssigneeMember) {
                return { status: 400, ok: false, message: "Không thể gán việc cho người không thuộc dự án." };
            }
        }

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

const searchTasksService = async ({ user, searchCondition, pageInfo }) => {
    try {
        const { project_id, keyword } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        const userProjects = await Project.find({
            $or: [{ manager_id: user._id }, { members: user._id }]
        }).select('_id');

        const userProjectIds = userProjects.map(p => p._id);

        if (userProjectIds.length === 0) {
            return {
                status: 200, ok: true, message: TASK_MESSAGES.GET_AVAILABLE_TASKS_SUCCESS,
                data: { records: [], pagination: { currentPage: 1, totalPages: 0, totalRecords: 0 } }
            };
        }

        const queryConditions = {
            is_deleted: { $ne: true },
            project_id: { $in: userProjectIds }
        };

        if (project_id) {
            queryConditions.project_id = project_id;
        }
        if (keyword) {
            queryConditions.name = { $regex: keyword, $options: 'i' };
        }

        const totalRecords = await Task.countDocuments(queryConditions);
        const tasks = await Task.find(queryConditions)
            .populate('project_id', 'name type')
            .populate('assignee_id', 'full_name email') // <-- DÒNG NÀY LÀM VIỆC ĐÓ
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const tasksWithOwnership = tasks.map(task => {
            const isMine = task.assignee_id ? task.assignee_id._id.equals(user._id) : false;
            return {
                ...task,
                is_mine: isMine
            };
        });

        return {
            status: 200, ok: true, message: TASK_MESSAGES.GET_AVAILABLE_TASKS_SUCCESS,
            data: {
                records: tasksWithOwnership,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalRecords / limit),
                    totalRecords,
                },
            },
        };

    } catch (error) {
        console.error("ERROR in searchTasksService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const joinTaskService = async ({ taskId, user }) => {
    try {
        const task = await Task.findById(taskId);

        if (!task) {
            return { status: 404, ok: false, message: "Không tìm thấy công việc." };
        }

        if (task.assignee_id) {
            return { status: 409, ok: false, message: "Công việc này đã có người khác nhận." };
        }

        const project = await Project.findById(task.project_id);
        const isUserInProject = project.manager_id.equals(user._id) || project.members.includes(user._id);
        if (!isUserInProject) {
            return { status: 403, ok: false, message: "Bạn phải là thành viên của dự án mới có thể nhận việc." };
        }

        task.assignee_id = user._id;
        task.status = 'in_progress';
        await task.save();

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const todaysAttendance = await Attendance.findOne({
            user_id: user._id,
            work_date: { $gte: startOfDay, $lte: endOfDay },
        });

        if (todaysAttendance) {
            const isWorkingMorning = !!todaysAttendance.morning.check_in_time && !todaysAttendance.morning.check_out_time;
            const isWorkingAfternoon = !!todaysAttendance.afternoon.check_in_time && !todaysAttendance.afternoon.check_out_time;

            if (isWorkingMorning || isWorkingAfternoon) {
                await Attendance.updateOne(
                    { _id: todaysAttendance._id },
                    { $addToSet: { tasks_worked_on: task._id } }
                );
            }
        }

        return { status: 200, ok: true, message: "Nhận việc thành công.", data: task };

    } catch (error) {
        console.error("ERROR in joinTaskService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const createTaskService = async ({ taskData, reporter }) => {
    try {
        const { name, description, project_id, parent_id, status, due_date } = taskData;

        if (!name || !project_id) {
            return { status: 400, ok: false, message: "Vui lòng cung cấp tên và project_id cho công việc." };
        }

        const project = await Project.findById(project_id);
        if (!project) {
            return { status: 404, ok: false, message: TASK_MESSAGES.PROJECT_NOT_FOUND };
        }

        if (parent_id) {
            const parentTask = await Task.findById(parent_id);
            if (!parentTask) {
                return { status: 404, ok: false, message: TASK_MESSAGES.PARENT_TASK_NOT_FOUND };
            }
            if (parentTask.project_id.toString() !== project_id) {
                return { status: 400, ok: false, message: TASK_MESSAGES.PARENT_TASK_MISMATCH };
            }
        }

        const newTask = await Task.create({
            name,
            description,
            project_id,
            parent_id,
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
    searchTasksService,
    joinTaskService,
    createTaskService,
    completeTaskService,
    softDeleteTaskService
};