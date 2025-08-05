const mongoose = require("mongoose");
const User = require("../models/user.model");
const Attendance = require("../models/attendance.model");
const Payroll = require("../models/payroll.model.js");
const Workplace = require("../models/workplace.model");
const Project = require("../models/project.model");
const Task = require("../models/task.model");
const Setting = require("../models/setting.model");
const bcrypt = require("bcrypt");
const sendEmail = require("../utils/sendEmail");
const { ADMIN_MESSAGES } = require("../constants/admin.messages");
const { GENERAL_MESSAGES } = require("../constants/auth.messages");

const updateMaintenanceModeService = async ({ is_maintenance_mode, maintenance_message, min_app_version }) => {
    try {
        const updateData = {};
        if (typeof is_maintenance_mode === 'boolean') {
            updateData.is_maintenance_mode = is_maintenance_mode;
        }
        if (maintenance_message) {
            updateData.maintenance_message = maintenance_message;
        }
        // << THÊM LOGIC CẬP NHẬT VERSION >>
        if (min_app_version) {
            updateData.min_app_version = min_app_version;
        }

        const newSettings = await Setting.findOneAndUpdate(
            {},
            { $set: updateData },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return { status: 200, ok: true, message: "Cập nhật cài đặt hệ thống thành công.", data: newSettings };

    } catch (error) {
        console.error("ERROR in updateMaintenanceModeService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const blockUserService = async ({ userIdToBlock, adminId, reason }) => {
    try {
        if (!reason) {
            return { status: 400, ok: false, message: ADMIN_MESSAGES.BLOCK_REASON_REQUIRED };
        }
        if (userIdToBlock === adminId) {
            return { status: 400, ok: false, message: ADMIN_MESSAGES.CANNOT_PERFORM_ACTION_ON_SELF };
        }
        const user = await User.findById(userIdToBlock);
        if (!user) {
            return { status: 404, ok: false, message: ADMIN_MESSAGES.USER_NOT_FOUND };
        }
        user.is_activated = false;
        user.refresh_token = null;
        await user.save();

        const emailSubject = ADMIN_MESSAGES.EMAIL_SUBJECTS.ACCOUNT_BLOCKED;
        const emailContent = ADMIN_MESSAGES.EMAIL_CONTENT.accountBlocked(user.full_name, reason);
        await sendEmail(user.email, emailSubject, emailContent);
        
        return { status: 200, ok: true, message: ADMIN_MESSAGES.BLOCK_SUCCESS(user.email) };
    } catch (error) {
        console.error("ERROR in blockUserService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const unblockUserService = async ({ userIdToUnblock }) => {
    try {
        const user = await User.findById(userIdToUnblock);
        if (!user) {
            return { status: 404, ok: false, message: ADMIN_MESSAGES.USER_NOT_FOUND };
        }
        user.is_activated = true;
        await user.save();

        const emailSubject = ADMIN_MESSAGES.EMAIL_SUBJECTS.ACCOUNT_UNBLOCKED;
        const emailContent = ADMIN_MESSAGES.EMAIL_CONTENT.accountUnblocked(user.full_name);
        await sendEmail(user.email, emailSubject, emailContent);

        return { status: 200, ok: true, message: ADMIN_MESSAGES.UNBLOCK_SUCCESS(user.email) };
    } catch (error) {
        console.error("ERROR in unblockUserService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const softDeleteUserService = async ({ userIdToDelete, adminId }) => {
    try {
        if (userIdToDelete === adminId) {
            return { status: 400, ok: false, message: ADMIN_MESSAGES.CANNOT_PERFORM_ACTION_ON_SELF };
        }
        const user = await User.findById(userIdToDelete);
        if (!user) {
            return { status: 404, ok: false, message: ADMIN_MESSAGES.USER_NOT_FOUND };
        }
        user.is_deleted = true;
        user.email = `${user.email}_deleted_${Date.now()}`;
        user.refresh_token = null;
        await user.save();
        return { status: 200, ok: true, message: ADMIN_MESSAGES.DELETE_SUCCESS };
    } catch (error) {
        console.error("ERROR in softDeleteUserService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const adminChangePasswordService = async ({ userIdToChange, newPassword, adminId }) => {
    try {
        if (!newPassword) {
            return { status: 400, ok: false, message: ADMIN_MESSAGES.CHANGE_PASSWORD_NEW_PASS_REQUIRED };
        }
        if (userIdToChange === adminId) {
            return { status: 400, ok: false, message: ADMIN_MESSAGES.CANNOT_PERFORM_ACTION_ON_SELF };
        }
        const user = await User.findById(userIdToChange);
        if (!user) {
            return { status: 404, ok: false, message: ADMIN_MESSAGES.USER_NOT_FOUND };
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.refresh_token = null;
        await user.save();
        return { status: 200, ok: true, message: ADMIN_MESSAGES.CHANGE_PASSWORD_SUCCESS(user.email) };
    } catch (error) {
        console.error("ERROR in adminChangePasswordService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const createEmployeeByAdminService = async ({ full_name, email, password }) => {
    try {
        if (!full_name || !email || !password) {
            return { status: 400, ok: false, message: ADMIN_MESSAGES.CREATE_USER_INFO_MISSING };
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return { status: 409, ok: false, message: ADMIN_MESSAGES.EMAIL_ALREADY_EXISTS };
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newEmployee = await User.create({ full_name, email, password: hashedPassword, role: 'employee', is_activated: true });
        const employeeResponse = newEmployee.toObject();
        delete employeeResponse.password;
        return { status: 201, ok: true, message: ADMIN_MESSAGES.CREATE_EMPLOYEE_SUCCESS, data: employeeResponse };
    } catch (error) {
        console.error("ERROR in createEmployeeByAdminService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const createAdminAccountService = async ({ full_name, email, password }) => {
    try {
        if (!full_name || !email || !password) {
            return { status: 400, ok: false, message: ADMIN_MESSAGES.CREATE_USER_INFO_MISSING };
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return { status: 409, ok: false, message: ADMIN_MESSAGES.EMAIL_ALREADY_EXISTS };
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newAdmin = await User.create({ full_name, email, password: hashedPassword, role: 'admin', is_activated: true });
        const adminResponse = newAdmin.toObject();
        delete adminResponse.password;
        return { status: 201, ok: true, message: ADMIN_MESSAGES.CREATE_ADMIN_SUCCESS, data: adminResponse };
    } catch (error) {
        console.error("ERROR in createAdminAccountService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const createPMByAdminService = async ({ full_name, email, password }) => {
    try {
        if (!full_name || !email || !password) {
            return { status: 400, ok: false, message: ADMIN_MESSAGES.CREATE_USER_INFO_MISSING };
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return { status: 409, ok: false, message: ADMIN_MESSAGES.EMAIL_ALREADY_EXISTS };
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newPM = await User.create({ full_name, email, password: hashedPassword, role: 'project_manager', is_activated: true });
        const pmResponse = newPM.toObject();
        delete pmResponse.password;
        return { status: 201, ok: true, message: ADMIN_MESSAGES.CREATE_PM_SUCCESS, data: pmResponse };
    } catch (error) {
        console.error("ERROR in createPMByAdminService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const createTLByAdminService = async ({ full_name, email, password }) => {
    try {
        if (!full_name || !email || !password) {
            return { status: 400, ok: false, message: ADMIN_MESSAGES.CREATE_USER_INFO_MISSING };
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return { status: 409, ok: false, message: ADMIN_MESSAGES.EMAIL_ALREADY_EXISTS };
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newTL = await User.create({ full_name, email, password: hashedPassword, role: 'team_leader', is_activated: true });
        const tlResponse = newTL.toObject();
        delete tlResponse.password;
        return { status: 201, ok: true, message: ADMIN_MESSAGES.CREATE_TL_SUCCESS, data: tlResponse };
    } catch (error) {
        console.error("ERROR in createTLByAdminService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const searchAllAttendancesService = async ({ searchCondition, pageInfo }) => {
    try {
        const { date_from, date_to, keyword } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};
        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;
        const queryConditions = {};
        if (keyword) {
            const users = await User.find({
                $or: [
                    { full_name: { $regex: keyword, $options: 'i' } },
                    { email: { $regex: keyword, $options: 'i' } }
                ]
            }).select('_id');
            const userIds = users.map(user => user._id);
            if (userIds.length === 0) {
                return {
                    status: 200, ok: true, message: ADMIN_MESSAGES.KEYWORD_NOT_FOUND,
                    data: { records: [], pagination: { currentPage: 1, totalPages: 0, totalRecords: 0 } }
                };
            }
            queryConditions.user_id = { $in: userIds };
        }
        if (date_from && date_to) {
            queryConditions.work_date = { $gte: new Date(date_from), $lte: new Date(date_to) };
        } else if (date_from) {
            queryConditions.work_date = { $gte: new Date(date_from) };
        } else if (date_to) {
            queryConditions.work_date = { $lte: new Date(date_to) };
        }
        const totalRecords = await Attendance.countDocuments(queryConditions);
        const records = await Attendance.find(queryConditions)
            .populate('user_id', 'full_name email image_url')
            .sort({ work_date: 'desc', check_in_time: 'desc' })
            .skip(skip)
            .limit(limit);
        return {
            status: 200, ok: true, message: ADMIN_MESSAGES.SEARCH_SUCCESS,
            data: {
                records,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalRecords / limit),
                    totalRecords,
                },
            },
        };
    } catch (error) {
        console.error("ERROR in searchAllAttendancesService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const searchAllTasksService = async ({ searchCondition, pageInfo }) => {
    try {
        const { project_id, keyword, status, assignee_id, is_deleted } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        const queryConditions = {};

        // Thêm các điều kiện lọc nếu admin cung cấp
        if (project_id) {
            queryConditions.project_id = project_id;
        }
        if (keyword) {
            queryConditions.name = { $regex: keyword, $options: 'i' };
        }
        if (status) {
            queryConditions.status = status;
        }
        if (assignee_id) {
            queryConditions.assignee_id = assignee_id;
        }
        if (typeof is_deleted === 'boolean') {
            queryConditions.is_deleted = is_deleted;
        }
        
        const totalRecords = await Task.countDocuments(queryConditions);
        const tasks = await Task.find(queryConditions)
            .populate('project_id', 'name')
            .populate('assignee_id', 'full_name email')
            .populate('reporter_id', 'full_name email')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        return {
            status: 200, ok: true, message: ADMIN_MESSAGES.SEARCH_SUCCESS,
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
        console.error("ERROR in searchAllTasksService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
// const searchWorkReportsService = async ({ searchCondition, pageInfo }) => {
//     try {
//         const { date_from, date_to, keyword, user_id } = searchCondition || {};
//         const { pageNum, pageSize } = pageInfo || {};
//         const page = parseInt(pageNum) || 1;
//         const limit = parseInt(pageSize) || 10;
//         const skip = (page - 1) * limit;
//         const queryConditions = {};
//         if (date_from || date_to) {
//             queryConditions.created_at = {};
//             if (date_from) {
//                 queryConditions.created_at.$gte = new Date(date_from);
//             }
//             if (date_to) {
//                 const endDate = new Date(date_to);
//                 endDate.setUTCHours(23, 59, 59, 999);
//                 queryConditions.created_at.$lte = endDate;
//             }
//         }
//         if (user_id) {
//             queryConditions.user_id = user_id;
//         }
//         if (keyword) {
//             queryConditions.description = { $regex: keyword, $options: 'i' };
//         }
//         const totalRecords = await WorkReport.countDocuments(queryConditions);
//         const records = await WorkReport.find(queryConditions)
//             .populate('user_id', 'full_name email')
//             .populate('work_type_id', 'name')
//             .sort({ created_at: 'desc' })
//             .skip(skip)
//             .limit(limit);
//         return {
//             status: 200, ok: true, message: ADMIN_MESSAGES.SEARCH_SUCCESS,
//             data: {
//                 records,
//                 pagination: { currentPage: page, totalPages: Math.ceil(totalRecords / limit), totalRecords },
//             },
//         };
//     } catch (error) {
//         console.error("ERROR in searchWorkReportsService:", error);
//         return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
//     }
// };

const searchUsersService = async ({ searchCondition, pageInfo }) => {
    try {
        const { keyword, role, is_activated } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        const queryConditions = { is_deleted: { $ne: true } };

        if (keyword) {
            // << PHẦN LOGIC MỚI >>
            const orConditions = [
                { full_name: { $regex: keyword, $options: 'i' } },
                { email: { $regex: keyword, $options: 'i' } }
            ];

            // Kiểm tra xem keyword có phải là một ObjectId hợp lệ không
            if (mongoose.Types.ObjectId.isValid(keyword)) {
                // Nếu đúng, thêm điều kiện tìm theo _id vào mảng
                orConditions.push({ _id: keyword });
            }

            queryConditions.$or = orConditions;
        }

        if (role) {
            queryConditions.role = role;
        }
        if (typeof is_activated === 'boolean') {
            queryConditions.is_activated = is_activated;
        }

        const totalRecords = await User.countDocuments(queryConditions);
        const records = await User.find(queryConditions)
            .select('-password -refresh_token')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);
            
        return {
            status: 200,
            ok: true,
            message: ADMIN_MESSAGES.SEARCH_SUCCESS,
            data: {
                records,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalRecords / limit),
                    totalRecords,
                },
            },
        };
    } catch (error) {
        console.error("ERROR in searchUsersService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const getDashboardStatsService = async () => {
    try {
        const [
            employeeCount,
            adminCount,
            projectCount,
            taskCount,
            payrollStats
        ] = await Promise.all([
            User.countDocuments({ role: 'employee', is_deleted: { $ne: true } }),
            User.countDocuments({ role: 'admin', is_deleted: { $ne: true } }),
            Project.countDocuments({ is_deleted: { $ne: true } }),
            Task.countDocuments({ is_deleted: { $ne: true } }),
            
            // << NÂNG CẤP AGGREGATION Ở ĐÂY >>
            Payroll.aggregate([
                { $match: { status: 'pending' } },
                { 
                    $group: { 
                        _id: null, // Nhóm tất cả lại
                        // Tính tổng cho từng trường lương và thưởng
                        totalSalaryPaid: { $sum: '$total_salary' },
                    
                        totalDiligenceBonusPaid: { $sum: '$diligence_bonus' },
                        totalPerformanceBonusPaid: { $sum: '$performance_bonus' },
                        totalOtherBonusPaid: { $sum: '$other_bonus' }
                    } 
                }
            ])
        ]);

        // payrollStats trả về là một mảng, ví dụ: [{ _id: null, totalSalaryPaid: 50M, ... }]
        // Lấy các giá trị total, nếu không có record nào thì mặc định là 0
        const {
            totalSalaryPaid = 0,
            totalBaseSalaryPaid = 0,
            totalDiligenceBonusPaid = 0,
            totalPerformanceBonusPaid = 0,
            totalOtherBonusPaid = 0,
        } = payrollStats[0] || {}; // Dùng || {} để tránh lỗi nếu mảng rỗng

        return {
            status: 200,
            ok: true,
            message: ADMIN_MESSAGES.GET_DASHBOARD_STATS_SUCCESS,
            data: {
                employeeCount,
                adminCount,
                projectCount,
                taskCount,
                // Trả về tất cả các số liệu đã tính
                totalSalaryPaid,
                totalBaseSalaryPaid,
                totalDiligenceBonusPaid,
                totalPerformanceBonusPaid,
                totalOtherBonusPaid,
            },
        };
    } catch (error) {
        console.error("ERROR in getDashboardStatsService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const updateEmployeeSalaryService = async ({ userIdToUpdate, salaryData }) => {
    try {
        const user = await User.findById(userIdToUpdate);
        if (!user || user.role === 'admin') {
            return { status: 404, ok: false, message: ADMIN_MESSAGES.USER_NOT_FOUND };
        }
        if (salaryData.base_salary_per_day !== undefined) {
            user.base_salary_per_day = salaryData.base_salary_per_day;
        }
        await user.save();
        const userResponse = user.toObject();
        delete userResponse.password;
        return { status: 200, ok: true, message: ADMIN_MESSAGES.UPDATE_SALARY_SUCCESS, data: userResponse };
    } catch (error) {
        console.error("ERROR in updateEmployeeSalaryService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const getEmployeeDetailsByIdService = async ({ userIdToView }) => {
    try {
        const user = await User.findById(userIdToView)
            .select('-password -refresh_token');
        if (!user || user.role === 'admin') {
            return { status: 404, ok: false, message: ADMIN_MESSAGES.USER_NOT_FOUND };
        }
        return { status: 200, ok: true, message: ADMIN_MESSAGES.GET_EMPLOYEE_DETAILS_SUCCESS, data: user };
    } catch (error) {
        console.error("ERROR in getEmployeeDetailsByIdService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const createWorkplaceService = async ({ name, latitude, longitude }) => {
    try {
        if (!name || latitude === undefined || longitude === undefined) {
            return { status: 400, ok: false, message: "Tên, vĩ độ và kinh độ là bắt buộc." };
        }
        
        const existingWorkplace = await Workplace.findOne({ name });
        if (existingWorkplace) {
            // Nếu địa điểm tồn tại và đang bị xóa mềm -> khôi phục lại
            if (existingWorkplace.is_deleted) {
                existingWorkplace.is_deleted = false;
                existingWorkplace.latitude = latitude;
                existingWorkplace.longitude = longitude;
                await existingWorkplace.save();
                return { status: 200, ok: true, message: "Khôi phục và cập nhật địa điểm thành công.", data: existingWorkplace };
            }
            // Nếu không thì báo lỗi trùng lặp
            return { status: 409, ok: false, message: "Tên địa điểm này đã tồn tại." };
        }

        const newWorkplace = await Workplace.create({ name, latitude, longitude });
        return { status: 201, ok: true, message: "Tạo địa điểm mới thành công.", data: newWorkplace };

    } catch (error) {
        console.error("ERROR in createWorkplaceService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

// Sửa lại hàm SEARCH: Chỉ lấy những địa điểm chưa bị xóa
const searchWorkplacesService = async ({ pageInfo }) => {
    try {
        const { pageNum, pageSize } = pageInfo || {};
        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        const queryConditions = { is_deleted: { $ne: true } }; // << THÊM ĐIỀU KIỆN LỌC

        const totalRecords = await Workplace.countDocuments(queryConditions);
        const records = await Workplace.find(queryConditions).sort({ createdAt: -1 }).skip(skip).limit(limit);

        return {
            status: 200, ok: true, message: "Lấy danh sách địa điểm thành công.",
            data: { records, pagination: { currentPage: page, totalPages: Math.ceil(totalRecords / limit), totalRecords } }
        };
    } catch (error) {
        console.error("ERROR in searchWorkplacesService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

// Sửa lại hàm UPDATE: Chỉ cho sửa địa điểm chưa bị xóa
const updateWorkplaceByIdService = async ({ workplaceId, updateData }) => {
    try {
        delete updateData._id;

        const updatedWorkplace = await Workplace.findOneAndUpdate(
            { _id: workplaceId, is_deleted: { $ne: true } }, // << THÊM ĐIỀU KIỆN LỌC
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedWorkplace) {
            return { status: 404, ok: false, message: "Không tìm thấy địa điểm để cập nhật." };
        }
        return { status: 200, ok: true, message: "Cập nhật địa điểm thành công.", data: updatedWorkplace };
    } catch (error) {
        console.error("ERROR in updateWorkplaceByIdService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

// Sửa lại hàm DELETE: Chuyển sang xóa mềm
const deleteWorkplaceService = async ({ workplaceId }) => {
    try {
        const deletedWorkplace = await Workplace.findOneAndUpdate(
            { _id: workplaceId, is_deleted: { $ne: true } }, // Tìm cái chưa bị xóa
            { $set: { is_deleted: true } }, // Đánh dấu là đã xóa
            { new: true }
        );

        if (!deletedWorkplace) {
            return { status: 404, ok: false, message: "Không tìm thấy địa điểm để xóa." };
        }
        return { status: 200, ok: true, message: "Xóa địa điểm thành công." };
    } catch (error) {
        console.error("ERROR in deleteWorkplaceService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
// File: src/services/admin.service.js

const searchAllProjectsService = async ({ searchCondition, pageInfo }) => {
    try {
        const { keyword, type, status, is_deleted } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        const matchStage = {};
        if (keyword) {
            matchStage.$or = [
                { name: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } }
            ];
        }
        if (type) {
            matchStage.type = type;
        }
        if (status) {
            matchStage.status = status;
        }
        if (typeof is_deleted === 'boolean') {
            matchStage.is_deleted = is_deleted;
        }

        const countPipeline = [
            { $match: matchStage },
            { $count: 'total' }
        ];

        const dataPipeline = [
            { $match: matchStage },
            { $sort: { created_at: -1 } },
            { $skip: skip },
            { $limit: limit },

            // << GIAI ĐOẠN 2 ĐƯỢC NÂNG CẤP >>
            // Join với collection 'tasks' NHƯNG CHỈ LẤY TASK ACTIVE
            {
                $lookup: {
                    from: 'tasks',
                    let: { projectId: '$_id' }, // Tạo biến projectId từ _id của project hiện tại
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    // Điều kiện 1: task.project_id phải bằng projectId của project
                                    $eq: ['$project_id', '$$projectId']
                                },
                                // Điều kiện 2: task phải active
                                is_deleted: false
                            }
                        }
                    ],
                    as: 'active_tasks_info' // Tên mảng mới chỉ chứa task active
                }
            },
            
            // Join với User để lấy tên manager
            {
                $lookup: {
                    from: 'users',
                    localField: 'manager_id',
                    foreignField: '_id',
                    as: 'manager_info'
                }
            },
            // Join với User để lấy thông tin members
            {
                $lookup: {
                    from: 'users',
                    localField: 'members',
                    foreignField: '_id',
                    as: 'members_info'
                }
            },
            // Giai đoạn 3: Thêm trường task_count dựa trên mảng active_tasks_info
            {
                $addFields: {
                    task_count: { $size: '$active_tasks_info' }, // << Đếm mảng task đã lọc
                    manager: { $arrayElemAt: ['$manager_info', 0] },
                    members: {
                        $map: {
                            input: '$members_info',
                            as: 'member',
                            in: {
                                _id: '$$member._id',
                                full_name: '$$member.full_name',
                                email: '$$member.email',
                                image_url: '$$member.image_url'
                            }
                        }
                    }
                }
            },
            // Giai đoạn cuối: Dọn dẹp
            {
                $project: {
                    active_tasks_info: 0, // << Bỏ trường tạm mới
                    manager_info: 0,
                    members_info: 0,
                    __v: 0,
                    'manager.password': 0,
                    'manager.refresh_token': 0,
                }
            }
        ];

        const [projects, totalRecordsResult] = await Promise.all([
            Project.aggregate(dataPipeline),
            Project.aggregate(countPipeline)
        ]);
        
        const totalRecords = totalRecordsResult[0]?.total || 0;

        return {
            status: 200, ok: true, message: ADMIN_MESSAGES.SEARCH_SUCCESS,
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
        console.error("ERROR in searchAllProjectsService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR, error: error.message };
    }
};
const addMemberToProjectService = async ({ projectId, userId }) => {
    try {
        if (!projectId || !userId) {
            return { status: 400, ok: false, message: "Vui lòng cung cấp projectId và userId." };
        }

        const [project, userToAdd] = await Promise.all([
            Project.findById(projectId),
            User.findById(userId)
        ]);

        if (!project) {
            return { status: 404, ok: false, message: ADMIN_MESSAGES.PROJECT_NOT_FOUND };
        }
        if (!userToAdd) {
            return { status: 404, ok: false, message: ADMIN_MESSAGES.USER_TO_ADD_NOT_FOUND };
        }
        
        if (userToAdd.role === 'admin') {
            return { status: 400, ok: false, message: ADMIN_MESSAGES.CANNOT_ADD_ADMIN_AS_MEMBER };
        }

        const isAlreadyInProject = project.manager_id.equals(userToAdd._id) || project.members.includes(userToAdd._id);
        if (isAlreadyInProject) {
            return { status: 409, ok: false, message: ADMIN_MESSAGES.ADD_MEMBER_ALREADY_EXISTS(userToAdd.email, project.name) };
        }

        project.members.push(userToAdd._id);
        await project.save();
        
        // << PHẦN GỬI EMAIL THÔNG BÁO >>
        const emailSubject = `Thông báo: Bạn đã được thêm vào dự án "${project.name}"`;
        const emailContent = `
            <h2>Xin chào ${userToAdd.full_name},</h2>
            <p>Bạn vừa được một quản trị viên thêm vào dự án <strong>${project.name}</strong> trên hệ thống WorkLocus.</p>
            <p>Bây giờ bạn có thể truy cập vào dự án và xem các công việc liên quan trong ứng dụng.</p>
            <p>Trân trọng,</p>
            <p>Đội ngũ WorkLocus</p>
        `;
        
        // Gửi email mà không cần chờ đợi, để response trả về cho admin nhanh hơn
        sendEmail(userToAdd.email, emailSubject, emailContent).catch(err => console.error("Gửi email thất bại:", err));

        return { status: 200, ok: true, message: ADMIN_MESSAGES.ADD_MEMBER_SUCCESS(userToAdd.email, project.name), data: project };

    } catch (error) {
        console.error("ERROR in addMemberToProjectService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const searchProjectMembersService = async ({ projectId, searchCondition, pageInfo }) => {
    try {
        if (!projectId) {
            return { status: 400, ok: false, message: ADMIN_MESSAGES.PROJECT_ID_REQUIRED };
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return { status: 404, ok: false, message: ADMIN_MESSAGES.PROJECT_NOT_FOUND };
        }

        const { keyword, is_activated, role } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        // Lấy danh sách ID thành viên và manager của dự án
        let memberIds = project.members.map(id => id.toString());
        if (project.manager_id) {
            memberIds.push(project.manager_id.toString());
        }
        
        // Điều kiện tìm kiếm cho User
        const queryConditions = { 
            _id: { $in: memberIds }, // Chỉ tìm trong số thành viên của dự án
            is_deleted: { $ne: true } 
        };

        if (keyword) {
            queryConditions.$or = [
                { full_name: { $regex: keyword, $options: 'i' } },
                { email: { $regex: keyword, $options: 'i' } }
            ];
        }
        if (role) {
            queryConditions.role = role;
        }
        if (typeof is_activated === 'boolean') {
            queryConditions.is_activated = is_activated;
        }

        const totalRecords = await User.countDocuments(queryConditions);
        const records = await User.find(queryConditions)
            .select('-password -refresh_token')
            .sort({ full_name: 1 }) // Sắp xếp theo tên cho dễ nhìn
            .skip(skip)
            .limit(limit);

        return {
            status: 200,
            ok: true,
            message: ADMIN_MESSAGES.SEARCH_SUCCESS,
            data: {
                records,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalRecords / limit),
                    totalRecords,
                },
            },
        };
    } catch (error) {
        console.error("ERROR in searchProjectMembersService:", error);
        // Trả về lỗi với status 400 nếu là lỗi xác thực (ví dụ: projectId không hợp lệ)
        if (error.name === 'CastError' && error.path === '_id') {
             return { status: 400, ok: false, message: ADMIN_MESSAGES.INVALID_PROJECT_ID };
        }
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const getSystemSettingsService = async () => {
    try {
        // Tìm một bản ghi setting duy nhất
        const settings = await Setting.findOne({});

        // Nếu không có bản ghi nào trong DB
        if (!settings) {
            // Vẫn trả về 200 OK, kèm theo data mặc định
            // Để client app có thể hoạt động bình thường với giá trị fallback
            return {
                status: 200,
                ok: true,
                message: "Chưa có cài đặt, trả về giá trị mặc định.",
                data: {
                    is_maintenance_mode: false,
                    maintenance_message: "",
                    min_app_version: "1.0.0" 
                }
            };
        }

        // Nếu tìm thấy, trả về 200 OK và data từ DB
        return { 
            status: 200, 
            ok: true, 
            message: "Lấy cài đặt hệ thống thành công.", 
            data: settings 
        };

    } catch (error) {
        // Chỉ khi có lỗi hệ thống (vd: mất kết nối DB) thì mới trả về 500
        console.error("ERROR in getSystemSettingsService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const updateUserRoleService = async ({ userIdToUpdate, newRole, adminId }) => {
    try {
        // Check 1: Admin không được tự đổi vai trò của chính mình qua API này
        if (userIdToUpdate === adminId) {
            return { status: 400, ok: false, message: ADMIN_MESSAGES.CANNOT_PERFORM_ACTION_ON_SELF };
        }

        // Check 2: Vai trò mới có hợp lệ không?
        const validRoles = User.schema.path('role').enumValues;
        if (!newRole || !validRoles.includes(newRole)) {
            return { status: 400, ok: false, message: `Vai trò '${newRole}' không hợp lệ. Các vai trò hợp lệ: ${validRoles.join(', ')}` };
        }
        
        // Check 3: Không cho phép nâng cấp lên 'admin' qua API này để bảo mật
        if (newRole === 'admin') {
            return { status: 403, ok: false, message: "Không thể nâng cấp lên vai trò 'admin' qua API này. Vui lòng dùng API tạo admin riêng." };
        }

        // Check 4: Tìm user và kiểm tra
        const user = await User.findById(userIdToUpdate);
        if (!user) {
            return { status: 404, ok: false, message: ADMIN_MESSAGES.USER_NOT_FOUND };
        }

        if (user.role === newRole) {
            return { status: 409, ok: false, message: `Người dùng này đã có vai trò '${newRole}'.` };
        }

        // Cập nhật và lưu lại
        user.role = newRole;
        await user.save();
        
        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.refresh_token;

        return { status: 200, ok: true, message: `Cập nhật vai trò cho ${user.email} thành '${newRole}' thành công.`, data: userResponse };

    } catch (error) {
        console.error("ERROR in updateUserRoleService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const getProjectTaskStatsService = async ({ searchCondition, pageInfo }) => {
    try {
        const { keyword } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        const matchStage = { is_deleted: false }; // Chỉ lấy project chưa xóa
        if (keyword) {
            matchStage.name = { $regex: keyword, $options: 'i' };
        }

        const pipeline = [
            { $match: matchStage },
            {
                $lookup: {
                    from: 'tasks',
                    localField: '_id',
                    foreignField: 'project_id',
                    // SỬA LẠI ĐIỀU KIỆN Ở ĐÂY CHO TƯỜNG MINH
                    pipeline: [
                        { $match: { is_deleted: false } } 
                    ],
                    as: 'tasks'
                }
            },
            {
                $addFields: {
                    total_tasks: { $size: "$tasks" },
                    done: { $size: { $filter: { input: "$tasks", as: "task", cond: { $eq: ["$$task.status", "done"] } } } },
                    in_progress: { $size: { $filter: { input: "$tasks", as: "task", cond: { $eq: ["$$task.status", "in_progress"] } } } },
                    todo: { $size: { $filter: { input: "$tasks", as: "task", cond: { $eq: ["$$task.status", "todo"] } } } },
                    last_activity_date: { $ifNull: [ { $max: "$tasks.updated_at" }, "$updated_at" ] }
                }
            },
            { $sort: { last_activity_date: -1 } },
            {
                $facet: {
                    records: [
                        { $skip: skip },
                        { $limit: limit },
                        { $project: { tasks: 0, __v: 0 } }
                    ],
                    pagination: [{ $count: 'totalRecords' }]
                }
            }
        ];

        const result = await Project.aggregate(pipeline);
        const records = result[0].records;
        const totalRecords = result[0].pagination[0] ? result[0].pagination[0].totalRecords : 0;

        return {
            status: 200,
            ok: true,
            message: "Lấy danh sách thống kê dự án thành công.",
            data: {
                records,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalRecords / limit),
                    totalRecords,
                }
            }
        };

    } catch (error) {
        console.error("ERROR in getProjectTaskStatsService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

/**
 * @description API #2 (ĐÃ NÂNG CẤP): Lấy danh sách giờ làm trung bình của NHIỀU nhân viên, có tìm kiếm, lọc theo ngày và phân trang.
 */
/**
 * @description API: Lấy danh sách giờ làm trung bình của NHIỀU nhân viên,
 * có tìm kiếm, lọc theo ngày – KHÔNG phân trang.
 */
const getEmployeeAverageHoursService = async ({ searchCondition = {}, date_from, date_to }) => {
    try {
        const { keyword = "" } = searchCondition;

        // --- Điều kiện lọc user ---
        const userMatch = {
            is_deleted: false,
            is_activated: true,
            role: { $nin: ["admin", "project_manager"] },
        };

        if (keyword) {
            userMatch.$or = [
                { full_name: { $regex: keyword, $options: "i" } },
                { email: { $regex: keyword, $options: "i" } },
            ];
        }

        // --- Điều kiện lọc ngày ---
        const dateMatch = {};
        if (date_from) {
            const start = new Date(date_from);
            start.setHours(0, 0, 0, 0);
            dateMatch.$gte = start;
        }
        if (date_to) {
            const end = new Date(date_to);
            end.setHours(23, 59, 59, 999);
            dateMatch.$lte = end;
        }

        // --- Pipeline ---
        const pipeline = [
            { $match: userMatch },

            // 1. Join Attendances
            {
                $lookup: {
                    from: "attendances",
                    localField: "_id",
                    foreignField: "user_id",
                    pipeline: [
                        {
                            $match: {
                                is_deleted: false,
                                ...(Object.keys(dateMatch).length && { work_date: dateMatch }),
                            },
                        },
                        {
                            $addFields: {
                                calculated_hours: {
                                    $divide: [
                                        {
                                            $add: [
                                                {
                                                    $cond: {
                                                        if: {
                                                            $and: [
                                                                "$morning.check_in_time",
                                                                "$morning.check_out_time",
                                                            ],
                                                        },
                                                        then: {
                                                            $subtract: [
                                                                "$morning.check_out_time",
                                                                "$morning.check_in_time",
                                                            ],
                                                        },
                                                        else: 0,
                                                    },
                                                },
                                                {
                                                    $cond: {
                                                        if: {
                                                            $and: [
                                                                "$afternoon.check_in_time",
                                                                "$afternoon.check_out_time",
                                                            ],
                                                        },
                                                        then: {
                                                            $subtract: [
                                                                "$afternoon.check_out_time",
                                                                "$afternoon.check_in_time",
                                                            ],
                                                        },
                                                        else: 0,
                                                    },
                                                },
                                            ],
                                        },
                                        36e5, // 3600000 ms => 1 giờ
                                    ],
                                },
                            },
                        },
                        { $match: { calculated_hours: { $gt: 0 } } },
                    ],
                    as: "attendance_records",
                },
            },

            // 2. Join Tasks (đã hoàn thành) – lọc ngày
            {
                $lookup: {
                    from: "tasks",
                    localField: "_id",
                    foreignField: "assignee_id",
                    pipeline: [
                        {
                            $match: {
                                status: "done",
                                is_deleted: false,
                                ...(Object.keys(dateMatch).length && { updated_at: dateMatch }),
                            },
                        },
                    ],
                    as: "completed_tasks",
                },
            },

            // 3. Join Tasks (tổng task) – KHÔNG lọc ngày
            {
                $lookup: {
                    from: "tasks",
                    localField: "_id",
                    foreignField: "assignee_id",
                    pipeline: [{ $match: { is_deleted: false } }],
                    as: "total_assigned_tasks",
                },
            },

            // 4. Tính toán chỉ số
            {
                $addFields: {
                    average_hours: { $avg: "$attendance_records.calculated_hours" },
                    total_days_worked: { $size: "$attendance_records" },
                    completed_tasks_count: { $size: "$completed_tasks" },
                    total_assigned_tasks_count: { $size: "$total_assigned_tasks" },
                },
            },

            // 5. Sắp xếp
            { $sort: { average_hours: -1 } },

            // 6. Chỉ trả về trường cần thiết
            {
                $project: {
                    full_name: 1,
                    email: 1,
                    role: 1,
                    image_url: 1,
                    average_hours: { $ifNull: ["$average_hours", 0] },
                    total_days_worked: 1,
                    completed_tasks_count: 1,
                    total_assigned_tasks_count: 1,
                },
            },
        ];

        // --- Thực thi ---
        const records = await User.aggregate(pipeline);

        return {
            status: 200,
            ok: true,
            message: "Lấy danh sách hiệu suất nhân viên thành công.",
            data: {
                records,
                totalRecords: records.length, // tiện trả kèm tổng số
            },
        };
    } catch (error) {
        console.error("ERROR in getEmployeeAverageHoursService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

/**
 * @description API #3: Lấy danh sách dự án kèm theo "sức khỏe" (tiến độ, số task, số member).
 */
const getProjectsHealthDashboardService = async ({ searchCondition, pageInfo }) => {
    try {
        const { keyword, status } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        // Chỉ lấy project chưa bị xóa
        const matchStage = { is_deleted: false }; 
        if (keyword) {
            matchStage.name = { $regex: keyword, $options: 'i' };
        }
        if (status) {
            matchStage.status = status;
        }

        const pipeline = [
            { $match: matchStage },
            {
                $lookup: {
                    from: 'tasks',
                    localField: '_id',
                    foreignField: 'project_id',
                    // <<< SỬA LỖI Ở ĐÂY: Thêm pipeline để chỉ lấy task chưa bị xóa >>>
                    pipeline: [
                        { $match: { is_deleted: false } }
                    ],
                    as: 'tasks_info'
                }
            },
            {
                $addFields: {
                    // Giờ các phép tính này sẽ dựa trên danh sách task đã được lọc, cho kết quả chính xác
                    total_tasks: { $size: "$tasks_info" },
                    completed_tasks: {
                        $size: { $filter: { input: "$tasks_info", as: "task", cond: { $eq: ["$$task.status", "done"] } } }
                    },
                    member_count: { $size: "$members" }
                }
            },
            {
                $addFields: {
                    progress_percentage: {
                        $cond: {
                            if: { $gt: ["$total_tasks", 0] },
                            then: { $multiply: [ { $divide: ["$completed_tasks", "$total_tasks"] }, 100 ] },
                            else: 0
                        }
                    }
                }
            },
            { $project: { tasks_info: 0, __v: 0 } },
            { $sort: { created_at: -1 } },
            {
                $facet: {
                    records: [{ $skip: skip }, { $limit: limit }],
                    pagination: [{ $count: 'totalRecords' }]
                }
            }
        ];

        const result = await Project.aggregate(pipeline);
        const records = result[0].records;
        const totalRecords = result[0].pagination[0] ? result[0].pagination[0].totalRecords : 0;

        return {
            status: 200,
            ok: true,
            message: "Lấy dashboard sức khỏe dự án thành công.",
            data: {
                records,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalRecords / limit),
                    totalRecords
                }
            }
        };

    } catch (error) {
        console.error("ERROR in getProjectsHealthDashboardService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const getUserAttendanceSummaryService = async ({ userId, date_from, date_to }) => {
    try {
        // Kiểm tra user tồn tại, không bị xóa
        const user = await User.findOne({ _id: userId, is_deleted: { $ne: true } });
        if (!user) {
            return { status: 404, ok: false, message: "Không tìm thấy nhân viên." };
        }
        // Điều kiện ngày
        const dateCond = {};
        if (date_from) dateCond.$gte = new Date(date_from);
        if (date_to) {
            const to = new Date(date_to);
            to.setHours(23, 59, 59, 999);
            dateCond.$lte = to;
        }
        // Điều kiện query
        const match = { user_id: userId, is_deleted: { $ne: true } };
        if (Object.keys(dateCond).length) match.work_date = dateCond;

        // Lấy danh sách attendance
        const attendances = await Attendance.find(match).sort({ work_date: 1 });

        // Tổng số ngày đi làm (số record)
        const total_days = attendances.length;

        // Tổng số giờ làm (tính cả sáng+chiều)
        let total_hours = 0;

        // Thống kê đi trễ
        let lateness_count = 0; // tổng lượt đi trễ (ca sáng/chiều)
        let lateness_days = 0;  // tổng số ngày có ít nhất 1 ca trễ
        let lateness_details = [];

        const details = attendances.map(a => {
            let hours = 0;
            let late_in_day = false;

            // Sáng
            let m_in = a.morning?.check_in_time ? new Date(a.morning.check_in_time) : null;
            let m_out = a.morning?.check_out_time ? new Date(a.morning.check_out_time) : null;
            if (m_in && m_out)
                hours += (m_out - m_in) / 36e5;
            if (m_in && (m_in.getHours() > 8 || (m_in.getHours() === 8 && m_in.getMinutes() > 0))) {
                lateness_count++;
                late_in_day = true;
                lateness_details.push({
                    date: a.work_date,
                    shift: "morning",
                    time: m_in,
                    hour: m_in.getHours(),
                    minute: m_in.getMinutes(),
                    late_type: "late-morning"
                });
            }

            // Chiều
            let a_in = a.afternoon?.check_in_time ? new Date(a.afternoon.check_in_time) : null;
            let a_out = a.afternoon?.check_out_time ? new Date(a.afternoon.check_out_time) : null;
            if (a_in && a_out)
                hours += (a_out - a_in) / 36e5;
            if (a_in && (a_in.getHours() > 13 || (a_in.getHours() === 13 && a_in.getMinutes() > 0))) {
                lateness_count++;
                late_in_day = true;
                lateness_details.push({
                    date: a.work_date,
                    shift: "afternoon",
                    time: a_in,
                    hour: a_in.getHours(),
                    minute: a_in.getMinutes(),
                    late_type: "late-afternoon"
                });
            }

            if (late_in_day) lateness_days++;

            total_hours += hours;
            return {
                date: a.work_date,
                hours,
                checkin_morning: a.morning?.check_in_time,
                checkout_morning: a.morning?.check_out_time,
                checkin_afternoon: a.afternoon?.check_in_time,
                checkout_afternoon: a.afternoon?.check_out_time,
                is_late_morning: !!(m_in && (m_in.getHours() > 8 || (m_in.getHours() === 8 && m_in.getMinutes() > 0))),
                is_late_afternoon: !!(a_in && (a_in.getHours() > 13 || (a_in.getHours() === 13 && a_in.getMinutes() > 0))),
            }
        });

        return {
            status: 200, ok: true,
            message: "Lấy thống kê công & giờ thành công.",
            data: {
                user_id: userId,
                full_name: user.full_name,
                email: user.email,
                total_days_worked: total_days,
                total_hours_worked: +total_hours.toFixed(2),
                average_hours_per_day: total_days > 0 ? +(total_hours / total_days).toFixed(2) : 0,
                lateness_count,
                lateness_days,
                lateness_details,
                details // List từng ngày
            }
        }
    } catch (err) {
        console.error("ERROR in getUserAttendanceSummaryService:", err);
        return { status: 500, ok: false, message: "Lỗi hệ thống!" };
    }
};



module.exports = {
    getUserAttendanceSummaryService,
    getProjectTaskStatsService,
    getEmployeeAverageHoursService,
    getProjectsHealthDashboardService,
    updateUserRoleService,
    getSystemSettingsService,
    getDashboardStatsService,
    searchProjectMembersService,
    updateMaintenanceModeService,
    addMemberToProjectService,
    updateMaintenanceModeService,
    searchAllTasksService,
    searchAllProjectsService,
    searchUsersService,
    blockUserService,
    unblockUserService,
    softDeleteUserService,
    adminChangePasswordService,
    createAdminAccountService,
    createEmployeeByAdminService,
    createPMByAdminService,
    createTLByAdminService,
    searchAllAttendancesService,
    updateEmployeeSalaryService,
    getEmployeeDetailsByIdService,
    createWorkplaceService,
    searchWorkplacesService,
    updateWorkplaceByIdService,
    deleteWorkplaceService,
};