const PerformanceBonus = require('../models/performanceBonus.model');
const { GENERAL_MESSAGES } = require('../constants/auth.messages');


const searchBonusesService = async ({ searchCondition, pageInfo }) => {
    try {
        const { keyword, is_active } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        const queryConditions = {};
        // << THAY ĐỔI THEO is_active >>
        // Mặc định chỉ lấy những bonus đang active (is_active: true)
        queryConditions.is_active = (typeof is_active === 'boolean') ? is_active : true;
        
        if (keyword) {
            queryConditions.grade = { $regex: keyword, $options: 'i' };
        }

        const totalRecords = await PerformanceBonus.countDocuments(queryConditions);
        const records = await PerformanceBonus.find(queryConditions).skip(skip).limit(limit).sort({ bonus_amount: -1 });

        return { status: 200, ok: true, message: "Lấy danh sách mức thưởng thành công.", data: { records, pagination: { currentPage: page, totalPages: Math.ceil(totalRecords / limit), totalRecords } } };
    } catch (error) {
        console.error("ERROR in searchBonusesService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const createBonusService = async (bonusData) => {
    try {
        const { grade, bonus_amount, description } = bonusData;
        if (!grade || bonus_amount === undefined) {
            return { status: 400, ok: false, message: "Vui lòng cung cấp hạng và mức thưởng." };
        }

        const existingBonus = await PerformanceBonus.findOne({ grade: grade.toUpperCase() });
        if (existingBonus) {
            // << THAY ĐỔI THEO is_active >>
            // Nếu đã tồn tại nhưng không active -> khôi phục và cập nhật
            if (!existingBonus.is_active) {
                existingBonus.is_active = true;
                existingBonus.bonus_amount = bonus_amount;
                existingBonus.description = description;
                await existingBonus.save();
                return { status: 200, ok: true, message: "Khôi phục và cập nhật mức thưởng thành công.", data: existingBonus };
            }
            return { status: 409, ok: false, message: "Hạng thưởng này đã tồn tại." };
        }

        const newBonus = await PerformanceBonus.create({ grade: grade.toUpperCase(), bonus_amount, description });
        return { status: 201, ok: true, message: "Tạo mức thưởng mới thành công.", data: newBonus };
    } catch (error) {
        console.error("ERROR in createBonusService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
const updateBonusService = async (bonusId, updateData) => {
    try {
        // Vẫn không cho phép cập nhật grade
        delete updateData.grade;

        // << SỬA LẠI ĐÂY: Tìm bằng ID >>
        const updatedBonus = await PerformanceBonus.findByIdAndUpdate(
            bonusId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedBonus || !updatedBonus.is_active) {
            return { status: 404, ok: false, message: "Không tìm thấy hạng thưởng này hoặc đã bị vô hiệu hóa." };
        }

        return { status: 200, ok: true, message: "Cập nhật mức thưởng thành công.", data: updatedBonus };
    } catch (error) {
        console.error("ERROR in updateBonusService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

const softDeleteBonusService = async (bonusId) => {
    try {
        // << SỬA LẠI ĐÂY: Tìm bằng ID >>
        const deletedBonus = await PerformanceBonus.findOneAndUpdate(
            { _id: bonusId, is_active: true }, // Tìm bonus đang active bằng ID
            { $set: { is_active: false } }, // Vô hiệu hóa nó
            { new: true }
        );

        if (!deletedBonus) {
            return { status: 404, ok: false, message: "Không tìm thấy hạng thưởng này hoặc đã bị vô hiệu hóa." };
        }

        return { status: 200, ok: true, message: "Vô hiệu hóa mức thưởng thành công." };
    } catch (error) {
        console.error("ERROR in softDeleteBonusService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};

module.exports = {
    searchBonusesService,
    createBonusService,
    updateBonusService,
    softDeleteBonusService,
};