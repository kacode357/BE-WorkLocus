const User = require("../models/user.model");
const Attendance = require("../models/attendance.model");
// const WorkReport = require("../models/workReport.model");
const Workplace = require("../models/workplace.model");
const Project = require("../models/project.model");
const Task = require("../models/task.model");
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

// const getDashboardStatsService = async () => {
//     try {
//         const employeeCount = await User.countDocuments({ role: 'employee', is_deleted: { $ne: true } });
//         const adminCount = await User.countDocuments({ role: 'admin', is_deleted: { $ne: true } });
//         const workReportCount = await WorkReport.countDocuments({ is_deleted: { $ne: true } });
//         const employees = await User.find({ role: 'employee', is_deleted: { $ne: true } }).select('_id');
//         const employeeIds = employees.map(emp => emp._id);
//         const attendances = await Attendance.find({ user_id: { $in: employeeIds } });
//         let totalWorkHours = 0;
//         let totalAttendanceRecords = 0;
//         for (const attendance of attendances) {
//             if (attendance.total_work_time) {
//                 const timeParts = attendance.total_work_time.split(' ');
//                 let hours = 0;
//                 let minutes = 0;
//                 if (timeParts.length >= 2) {
//                     hours = parseInt(timeParts[0]) || 0;
//                     if (timeParts.length >= 4) {
//                         minutes = parseInt(timeParts[2]) || 0;
//                     }
//                     totalWorkHours += hours + (minutes / 60);
//                     totalAttendanceRecords++;
//                 }
//             }
//         }
//         const averageWorkHoursPerEmployee = employeeCount > 0 && totalAttendanceRecords > 0
//             ? (totalWorkHours / employeeCount).toFixed(2)
//             : 0;
//         return {
//             status: 200,
//             ok: true,
//             message: ADMIN_MESSAGES.GET_DASHBOARD_STATS_SUCCESS,
//             data: {
//                 employeeCount,
//                 adminCount,
//                 workReportCount,
//                 averageWorkHoursPerEmployee: parseFloat(averageWorkHoursPerEmployee),
//             },
//         };
//     } catch (error) {
//         console.error("ERROR in getDashboardStatsService:", error);
//         return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
//     }
// };

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

const updateWorkplaceLocationService = async ({ name, latitude, longitude }) => {
    try {
        if (!name || latitude === undefined || longitude === undefined) {
            return { status: 400, ok: false, message: ADMIN_MESSAGES.WORKPLACE_INFO_REQUIRED };
        }
        const latNum = parseFloat(String(latitude).replace(',', '.'));
        const lngNum = parseFloat(String(longitude).replace(',', '.'));
        if (isNaN(latNum) || isNaN(lngNum)) {
            return { status: 400, ok: false, message: ADMIN_MESSAGES.WORKPLACE_INVALID_COORDINATES };
        }
        const updatedWorkplace = await Workplace.findOneAndUpdate(
            {},
            {
                name,
                latitude: latNum,
                longitude: lngNum
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        return {
            status: 200,
            ok: true,
            message: ADMIN_MESSAGES.UPDATE_WORKPLACE_SUCCESS,
            data: updatedWorkplace,
        };
    } catch (error) {
        console.error("ERROR in updateWorkplaceLocationService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const getWorkplaceLocationService = async () => {
    try {
        const workplace = await Workplace.findOne({});
        if (!workplace) {
            return {
                status: 200,
                ok: true,
                message: ADMIN_MESSAGES.WORKPLACE_NOT_SET,
                data: null,
            };
        }
        return {
            status: 200,
            ok: true,
            message: ADMIN_MESSAGES.GET_WORKPLACE_SUCCESS,
            data: workplace,
        };
    } catch (error) {
        console.error("ERROR in getWorkplaceLocationService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
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
            {
                $lookup: {
                    from: 'tasks',
                    localField: '_id',
                    foreignField: 'project_id',
                    as: 'tasks_info'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'manager_id',
                    foreignField: '_id',
                    as: 'manager_info'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'members',
                    foreignField: '_id',
                    as: 'members_info'
                }
            },
            // << GIAI ĐOẠN SỬA LỖI BẮT ĐẦU TỪ ĐÂY >>
            {
                $addFields: {
                    task_count: { $size: '$tasks_info' },
                    // Chuyển manager_info từ mảng 1 phần tử thành object
                    manager: { $arrayElemAt: ['$manager_info', 0] },
                    // Tạo trường 'members' mới chỉ chứa các thông tin cần thiết
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
            // Giai đoạn cuối: Dọn dẹp, chỉ dùng exclusion
            {
                $project: {
                    tasks_info: 0,
                    manager_info: 0,
                    members_info: 0,
                    __v: 0,
                    'manager.password': 0,
                    'manager.refresh_token': 0,
                    'manager.is_activated': 0,
                    'manager.is_deleted': 0,
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
                // Không cần map lại ở đây nữa vì đã xử lý trong aggregation
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
module.exports = {
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
    updateWorkplaceLocationService,
    getWorkplaceLocationService
};