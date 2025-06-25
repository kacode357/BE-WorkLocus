const User = require("../models/user.model");
const Attendance = require("../models/attendance.model");
const WorkReport = require("../models/workReport.model");
const bcrypt = require("bcrypt");
const sendEmail = require("../utils/sendEmail");
const { ADMIN_MESSAGES } = require("../constants/admin.messages");
const { GENERAL_MESSAGES } = require("../constants/auth.messages");

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
        const emailSubject = "Thông báo: Tài khoản của bạn đã bị khóa";
        const emailContent = `<h2>Xin chào ${user.full_name},</h2><p>Tài khoản của bạn tại WorkLocus đã bị khóa bởi quản trị viên.</p><p><strong>Lý do:</strong> ${reason}</p><p>Vui lòng liên hệ bộ phận hỗ trợ nếu bạn có câu hỏi.</p>`;
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
        const emailSubject = "Thông báo: Tài khoản của bạn đã được mở khóa";
        const emailContent = `<h2>Xin chào ${user.full_name},</h2><p>Tài khoản của bạn tại WorkLocus đã được kích hoạt trở lại. Bây giờ bạn có thể đăng nhập.</p>`;
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

const searchWorkReportsService = async ({ searchCondition, pageInfo }) => {
    try {
        const { date_from, date_to, keyword, user_id } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        const queryConditions = {};

        if (date_from && date_to) {
            queryConditions.created_at = { $gte: new Date(date_from), $lte: new Date(date_to) };
        }
        if (user_id) {
            queryConditions.user_id = user_id;
        }
        if (keyword) {
            queryConditions.description = { $regex: keyword, $options: 'i' };
        }

        const totalRecords = await WorkReport.countDocuments(queryConditions);
        const records = await WorkReport.find(queryConditions)
            .populate('user_id', 'full_name email')
            .populate('work_type_id', 'name')
            .sort({ created_at: 'desc' })
            .skip(skip)
            .limit(limit);

        return {
            status: 200, ok: true, message: ADMIN_MESSAGES.SEARCH_SUCCESS,
            data: {
                records,
                pagination: { currentPage: page, totalPages: Math.ceil(totalRecords / limit), totalRecords },
            },
        };
    } catch (error) {
        console.error("ERROR in searchWorkReportsService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const searchUsersService = async ({ searchCondition, pageInfo }) => {
    try {
        const { keyword, role } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        // Điều kiện tìm kiếm cơ bản: không lấy các user đã bị xóa mềm
        const queryConditions = { is_deleted: { $ne: true } };

        // 1. Lọc theo keyword (tìm trong tên và email)
        if (keyword) {
            queryConditions.$or = [
                { full_name: { $regex: keyword, $options: 'i' } },
                { email: { $regex: keyword, $options: 'i' } }
            ];
        }

        // 2. Lọc theo role
        if (role) {
            queryConditions.role = role;
        }

        // Đếm tổng số bản ghi khớp điều kiện
        const totalRecords = await User.countDocuments(queryConditions);

        // Lấy danh sách user theo điều kiện, sắp xếp và phân trang
        const records = await User.find(queryConditions)
            .select('-password -refresh_token') // Loại bỏ các trường nhạy cảm
            .sort({ created_at: -1 }) // Sắp xếp theo ngày tạo mới nhất
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
module.exports = {
    searchUsersService,
    blockUserService,
    unblockUserService,
    softDeleteUserService,
    adminChangePasswordService,
    createAdminAccountService,
    createEmployeeByAdminService,
    searchAllAttendancesService,
    searchWorkReportsService,
};
