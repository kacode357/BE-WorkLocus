const User = require("../models/user.model");
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
module.exports = {
    updateProfileService,
    changePasswordService,
    updateEmployeeBankInfoService
};
