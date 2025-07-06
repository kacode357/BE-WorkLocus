// File: src/services/project.service.js
const Project = require("../models/project.model.js");
const User = require("../models/user.model.js");
const Task = require("../models/task.model.js");
const { PROJECT_MESSAGES } = require("../constants/project.messages.js");
const { GENERAL_MESSAGES } = require("../constants/auth.messages.js");

const completeProjectService = async ({ projectId }) => {
    try {
        const project = await Project.findById(projectId);
        if (!project) {
            return { status: 404, ok: false, message: "Không tìm thấy dự án." };
        }
        if (project.status === 'completed') {
            return { status: 409, ok: false, message: "Dự án này đã được hoàn thành trước đó." };
        }

        // KIỂM TRA DEPENDENCY
        const unfinishedTasksCount = await Task.countDocuments({
            project_id: projectId,
            status: { $ne: 'done' }
        });

        if (unfinishedTasksCount > 0) {
            return { status: 400, ok: false, message: `Không thể hoàn thành. Còn ${unfinishedTasksCount} công việc chưa xong.` };
        }

        project.status = 'completed';
        await project.save();

        return { status: 200, ok: true, message: "Dự án đã được đánh dấu hoàn thành.", data: project };

    } catch (error) {
        console.error("ERROR in completeProjectService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const joinProjectService = async ({ projectId, user }) => {
    try {
        const project = await Project.findById(projectId);

        // Check 1: Dự án có tồn tại không?
        if (!project) {
            return { status: 404, ok: false, message: "Không tìm thấy dự án." };
        }

        // Check 2: Dự án có phải là public không?
        if (project.type !== 'public') {
            return { status: 403, ok: false, message: "Đây là dự án riêng tư, bạn không thể tự tham gia." };
        }

        // Check 3: User đã là manager hoặc member chưa?
        const isAlreadyInProject = project.manager_id.equals(user._id) || project.members.includes(user._id);
        if (isAlreadyInProject) {
            return { status: 409, ok: false, message: "Bạn đã là thành viên của dự án này rồi." };
        }

        // Nếu mọi thứ ổn, thêm user vào mảng members
        project.members.push(user._id);
        await project.save();

        return { status: 200, ok: true, message: "Tham gia dự án thành công.", data: project };

    } catch (error) {
        console.error("ERROR in joinProjectService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const createProjectService = async ({ projectData, creator }) => {
    try {
        // Lấy thêm 'type' từ projectData
        const { name, description, type, members, start_date, end_date } = projectData;

        // 1. Kiểm tra thông tin cơ bản
        if (!name || !description) {
            return { status: 400, ok: false, message: PROJECT_MESSAGES.MISSING_INFO };
        }

        // 2. Người tạo dự án chính là người quản lý (manager)
        const manager_id = creator._id;

        // 3. (Optional) Kiểm tra members
        if (members && members.length > 0) {
            const existingUsers = await User.countDocuments({ _id: { $in: members } });
            if (existingUsers !== members.length) {
                return { status: 404, ok: false, message: "Một hoặc nhiều thành viên được thêm vào không tồn tại." };
            }
        }

        // 4. Tạo dự án (truyền cả 'type' vào)
        const newProject = await Project.create({
            name,
            description,
            type, // Thêm type vào đây, nếu không có thì nó sẽ lấy giá trị default trong model
            manager_id,
            members,
            start_date,
            end_date,
        });

        return {
            status: 201,
            ok: true,
            message: PROJECT_MESSAGES.CREATE_SUCCESS,
            data: newProject,
        };

    } catch (error) {
        console.error("ERROR in createProjectService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const searchProjectsForEmployeeService = async ({ user, searchCondition, pageInfo }) => {
    try {
        const { keyword } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        // Xây dựng điều kiện query cơ bản (quyền xem)
        const queryConditions = {
            is_deleted: { $ne: true },
            $or: [
                { type: 'public' },
                { members: user._id }
            ]
        };

        // Nếu có keyword, thêm điều kiện tìm kiếm vào query
        if (keyword) {
            const keywordRegex = { $regex: keyword, $options: 'i' };
            // Dùng $and để kết hợp điều kiện quyền xem VÀ điều kiện keyword
            queryConditions.$and = [
                {
                    $or: [
                        { name: keywordRegex },
                        { description: keywordRegex }
                    ]
                }
            ];
        }

        const totalRecords = await Project.countDocuments(queryConditions);
        const projects = await Project.find(queryConditions)
            .populate('manager_id', 'full_name email')
            .select('-__v -is_deleted')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        return {
            status: 200,
            ok: true,
            message: PROJECT_MESSAGES.GET_PROJECTS_SUCCESS,
            data: {
                records: projects,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalRecords / limit),
                    totalRecords,
                },
            },
        };
    } catch (error) {
        console.error("ERROR in searchProjectsForEmployeeService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const softDeleteProjectService = async ({ projectId }) => {
    try {
        const project = await Project.findById(projectId);
        if (!project || project.is_deleted) {
            return { status: 404, ok: false, message: "Không tìm thấy dự án." };
        }

        // Bước 1: Xóa mềm chính dự án đó
        project.is_deleted = true;
        await project.save();

        // Bước 2: Xóa mềm TẤT CẢ các task thuộc về dự án này
        await Task.updateMany(
            { project_id: projectId },
            { $set: { is_deleted: true } }
        );

        return { status: 200, ok: true, message: "Xóa dự án và tất cả công việc liên quan thành công." };

    } catch (error) {
        console.error("ERROR in softDeleteProjectService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const updateProjectService = async ({ projectId, updateData }) => {
    try {
        // Loại bỏ các trường không cho phép sửa qua API này
        const forbiddenFields = ['manager_id', 'members', 'is_deleted'];
        forbiddenFields.forEach(field => delete updateData[field]);

        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            { $set: updateData },
            { new: true, runValidators: true } // new: true để trả về document đã update, runValidators: true để chạy schema validation
        ).select('-__v');

        if (!updatedProject) {
            return { status: 404, ok: false, message: "Không tìm thấy dự án để cập nhật." };
        }

        return { status: 200, ok: true, message: "Cập nhật dự án thành công.", data: updatedProject };

    } catch (error) {
        console.error("ERROR in updateProjectService:", error);
        // Bắt lỗi validation từ Mongoose
        if (error.name === 'ValidationError') {
            return { status: 400, ok: false, message: error.message };
        }
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const removeMemberFromProjectService = async ({ projectId, userIdToRemove }) => {
    try {
        const project = await Project.findById(projectId);
        if (!project) {
            return { status: 404, ok: false, message: PROJECT_MESSAGES.PROJECT_NOT_FOUND };
        }

        // Check 1: Không cho phép xóa chính người quản lý dự án
        if (project.manager_id.equals(userIdToRemove)) {
            return { status: 400, ok: false, message: PROJECT_MESSAGES.CANNOT_REMOVE_MANAGER };
        }

        // Check 2: Kiểm tra xem user có thực sự là member không
        const isMember = project.members.includes(userIdToRemove);
        if (!isMember) {
            return { status: 404, ok: false, message: PROJECT_MESSAGES.MEMBER_NOT_FOUND_IN_PROJECT };
        }

        // Hành động 1: Xóa user khỏi mảng members của project (dùng $pull)
        await Project.updateOne(
            { _id: projectId },
            { $pull: { members: userIdToRemove } }
        );

        // Hành động 2: Gỡ assignment của user này khỏi tất cả các task trong project
        await Task.updateMany(
            { project_id: projectId, assignee_id: userIdToRemove },
            { $set: { assignee_id: null, status: 'todo' } } // Gỡ người làm và đưa task về trạng thái 'cần làm'
        );

        return { status: 200, ok: true, message: PROJECT_MESSAGES.REMOVE_MEMBER_SUCCESS };

    } catch (error) {
        console.error("ERROR in removeMemberFromProjectService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
module.exports = {
    removeMemberFromProjectService,
    updateProjectService,
    softDeleteProjectService,
    joinProjectService,
    searchProjectsForEmployeeService,
    createProjectService,
    completeProjectService
};