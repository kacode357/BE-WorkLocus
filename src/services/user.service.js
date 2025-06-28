const User = require("../models/user.model");
const Payroll = require("../models/payroll.model");
const bcrypt = require("bcrypt");
const { USER_MESSAGES } = require("../constants/user.messages");
const { GENERAL_MESSAGES } = require("../constants/auth.messages");

const updateProfileService = async ({ userId, updateData }) => {
    try {
        const allowedUpdates = ['full_name', 'image_url'];
        const updates = {};
        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = updateData[key];
            }
        });

        if (Object.keys(updates).length === 0) {
            return { status: 400, ok: false, message: USER_MESSAGES.UPDATE_PROFILE_NO_DATA };
        }

        const updatedUser = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true })
            .select('-password -refresh_token');

        if (!updatedUser) {
            return { status: 404, ok: false, message: USER_MESSAGES.USER_NOT_FOUND };
        }

        return { status: 200, ok: true, message: USER_MESSAGES.UPDATE_PROFILE_SUCCESS, data: updatedUser };
    } catch (error) {
        console.error("ERROR in updateProfileService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const changePasswordService = async ({ userId, currentPassword, newPassword }) => {
    try {
        if (!currentPassword || !newPassword) {
            return { status: 400, ok: false, message: USER_MESSAGES.CHANGE_PASSWORD_INFO_MISSING };
        }

        const user = await User.findById(userId);
        if (!user) {
            return { status: 404, ok: false, message: USER_MESSAGES.USER_NOT_FOUND };
        }

        const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordMatch) {
            return { status: 400, ok: false, message: USER_MESSAGES.CURRENT_PASSWORD_INCORRECT };
        }

        if (currentPassword === newPassword) {
            return { status: 400, ok: false, message: USER_MESSAGES.NEW_PASSWORD_SAME_AS_OLD };
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.refresh_token = null;
        await user.save();

        return { status: 200, ok: true, message: USER_MESSAGES.CHANGE_PASSWORD_SUCCESS };
    } catch (error) {
        console.error("ERROR in changePasswordService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const updateEmployeeBankInfoService = async ({ userIdToUpdate, bankData }) => {
     try {
        const user = await User.findById(userIdToUpdate);
    

        const allowedUpdates = ['bank_name', 'bank_account_number'];
        Object.keys(bankData).forEach(key => {
            if (allowedUpdates.includes(key)) {
                user[key] = bankData[key];
            }
        });

        await user.save();
        const userResponse = user.toObject();
        delete userResponse.password;
        return { status: 200, ok: true, message: "Cập nhật thông tin ngân hàng thành công.", data: userResponse };
    } catch (error) {
        console.error("ERROR in updateEmployeeBankInfoService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const getUserPayrollsService = async ({ userId, searchCondition, pageInfo }) => {
    try {
        // Lấy điều kiện lọc và phân trang từ input
        const { month, year } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10; // Mặc định 10 record/trang
        const skip = (page - 1) * limit;

        // --- ĐIỂM BẢO MẬT QUAN TRỌNG ---
        // Query luôn bắt đầu với user_id lấy từ token.
        // Điều này đảm bảo user chỉ thấy được lương của chính mình.
        const queryConditions = { user_id: userId };

        // Thêm điều kiện lọc theo tháng, năm nếu user cung cấp
        if (month) queryConditions.month = parseInt(month);
        if (year) queryConditions.year = parseInt(year);

        // Đếm tổng số bản ghi khớp điều kiện để phân trang
        const totalRecords = await Payroll.countDocuments(queryConditions);

        // Lấy dữ liệu lương theo điều kiện, sắp xếp mới nhất lên đầu
        const records = await Payroll.find(queryConditions)
            .select('-user_id') // Bỏ trường user_id khỏi kết quả cho gọn
            .sort({ year: -1, month: -1 })
            .skip(skip)
            .limit(limit);

        return {
            status: 200,
            ok: true,
            message: "Lấy lịch sử lương thành công.",
            data: {
                records,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalRecords / limit),
                    totalRecords
                },
            },
        };
    } catch (error) {
        console.error("ERROR in getUserPayrollsService:", error);
        return { status: 500, ok: false, message: "Lỗi hệ thống khi lấy lịch sử lương." };
    }
};
module.exports = {
    updateProfileService,
    changePasswordService,
    updateEmployeeBankInfoService,
    getUserPayrollsService,
};
