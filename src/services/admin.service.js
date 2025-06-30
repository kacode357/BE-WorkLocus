const User = require("../models/user.model");
const Attendance = require("../models/attendance.model");
const WorkReport = require("../models/workReport.model");
const Workplace = require("../models/workplace.model");
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

        // Bắt đầu xây dựng điều kiện query
        const queryConditions = {};

        // === PHẦN SỬA LỖI NẰM Ở ĐÂY ===
        if (date_from || date_to) {
            queryConditions.created_at = {};
            if (date_from) {
                // $gte: Lấy từ đầu ngày date_from
                queryConditions.created_at.$gte = new Date(date_from);
            }
            if (date_to) {
                // $lte: Lấy đến cuối ngày date_to (23:59:59.999)
                const endDate = new Date(date_to);
                endDate.setUTCHours(23, 59, 59, 999); // Đặt thời gian đến cuối ngày
                queryConditions.created_at.$lte = endDate;
            }
        }
        // === KẾT THÚC PHẦN SỬA ===
        
        if (user_id) {
            queryConditions.user_id = user_id;
        }
        if (keyword) {
            // Giả sử mày muốn tìm keyword trong description
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
// HÀM ĐÃ ĐƯỢC CẬP NHẬT
const searchUsersService = async ({ searchCondition, pageInfo }) => {
    try {
        // 1. Lấy thêm is_activated từ request
        const { keyword, role, is_activated } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        // Điều kiện cơ bản: luôn không lấy user đã xóa mềm
        const queryConditions = { is_deleted: { $ne: true } };

        // Lọc theo keyword
        if (keyword) {
            queryConditions.$or = [
                { full_name: { $regex: keyword, $options: 'i' } },
                { email: { $regex: keyword, $options: 'i' } }
            ];
        }

        // Lọc theo role
        if (role) {
            queryConditions.role = role;
        }

        // 2. THAY ĐỔI: Lọc theo is_activated nếu nó được cung cấp
        // typeof is_activated === 'boolean' đảm bảo chỉ lọc khi giá trị là true hoặc false
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
// Service mới cho dashboard stats
const getDashboardStatsService = async () => {
    try {
        // Đếm số nhân viên (employee) và quản trị (admin)
        const employeeCount = await User.countDocuments({ role: 'employee', is_deleted: { $ne: true } });
        const adminCount = await User.countDocuments({ role: 'admin', is_deleted: { $ne: true } });

        // Đếm tổng số báo cáo công việc
        const workReportCount = await WorkReport.countDocuments({ is_deleted: { $ne: true } });

        // Tính giờ làm trung bình mỗi nhân viên
        const employees = await User.find({ role: 'employee', is_deleted: { $ne: true } }).select('_id');
        const employeeIds = employees.map(emp => emp._id);

        // Lấy tất cả attendance của nhân viên
        const attendances = await Attendance.find({ user_id: { $in: employeeIds } });
        
        let totalWorkHours = 0;
        let totalAttendanceRecords = 0;

        for (const attendance of attendances) {
            if (attendance.total_work_time) {
                // Parse total_work_time có format "X giờ Y phút"
                const timeParts = attendance.total_work_time.split(' ');
                let hours = 0;
                let minutes = 0;

                if (timeParts.length >= 2) {
                    hours = parseInt(timeParts[0]) || 0; // Lấy số giờ
                    if (timeParts.length >= 4) {
                        minutes = parseInt(timeParts[2]) || 0; // Lấy số phút
                    }
                    totalWorkHours += hours + (minutes / 60); // Chuyển phút thành giờ
                    totalAttendanceRecords++;
                }
            }
        }

        // Tính giờ trung bình mỗi nhân viên
        const averageWorkHoursPerEmployee = employeeCount > 0 && totalAttendanceRecords > 0
            ? (totalWorkHours / employeeCount).toFixed(2)
            : 0;

        return {
            status: 200,
            ok: true,
            message: "Lấy thống kê dashboard thành công.",
            data: {
                employeeCount,
                adminCount,
                workReportCount,
                averageWorkHoursPerEmployee: parseFloat(averageWorkHoursPerEmployee),
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

        // Chỉ cho phép sửa đúng một trường
        if (salaryData.base_salary_per_day !== undefined) {
            user.base_salary_per_day = salaryData.base_salary_per_day;
        }

        await user.save();
        const userResponse = user.toObject();
        delete userResponse.password;
        return { status: 200, ok: true, message: "Cập nhật lương cơ bản thành công.", data: userResponse };
    } catch (error) {
        console.error("ERROR in updateEmployeeSalaryService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const getEmployeeDetailsByIdService = async ({ userIdToView }) => {
    try {
        const user = await User.findById(userIdToView)
            .select('-password -refresh_token'); // Không trả về password

        if (!user || user.role === 'admin') {
            return { status: 404, ok: false, message: ADMIN_MESSAGES.USER_NOT_FOUND };
        }
        return { status: 200, ok: true, message: "Lấy thông tin chi tiết nhân viên thành công.", data: user };
    } catch (error) {
        console.error("ERROR in getEmployeeDetailsByIdService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const updateWorkplaceLocationService = async ({ name, latitude, longitude }) => {
    try {
        // Thêm kiểm tra cho 'name'
        if (!name || latitude === undefined || longitude === undefined) {
            return { status: 400, ok: false, message: "Tên, vĩ độ và kinh độ là bắt buộc." };
        }

        const latNum = parseFloat(String(latitude).replace(',', '.'));
        const lngNum = parseFloat(String(longitude).replace(',', '.'));

        if (isNaN(latNum) || isNaN(lngNum)) {
             return { status: 400, ok: false, message: "Định dạng vĩ độ hoặc kinh độ không hợp lệ." };
        }
        
        const updatedWorkplace = await Workplace.findOneAndUpdate(
            {},
            { 
                name, // << LƯU CẢ TÊN >>
                latitude: latNum,
                longitude: lngNum
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return {
            status: 200,
            ok: true,
            message: "Cập nhật địa điểm làm việc thành công.",
            data: updatedWorkplace,
        };
    } catch (error) {
        console.error("ERROR in updateWorkplaceLocationService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const getWorkplaceLocationService = async () => {
    try {
        // Vì chỉ có 1 địa điểm duy nhất, ta dùng findOne
        const workplace = await Workplace.findOne({});

        if (!workplace) {
            // Trường hợp chưa có địa điểm nào được lưu
            return {
                status: 200, // Vẫn là 200 OK, nhưng data là null
                ok: true,
                message: "Chưa có địa điểm làm việc nào được thiết lập.",
                data: null,
            };
        }

        return {
            status: 200,
            ok: true,
            message: "Lấy thông tin địa điểm làm việc thành công.",
            data: workplace,
        };
    } catch (error) {
        console.error("ERROR in getWorkplaceLocationService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
module.exports = {
    getDashboardStatsService,
    searchUsersService,
    blockUserService,
    unblockUserService,
    softDeleteUserService,
    adminChangePasswordService,
    createAdminAccountService,
    createEmployeeByAdminService,
    searchAllAttendancesService,
    searchWorkReportsService,
    updateEmployeeSalaryService,
    getEmployeeDetailsByIdService,
    updateWorkplaceLocationService, 
    getWorkplaceLocationService
};
