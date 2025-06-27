// File: services/performanceBonus.service.js
const PerformanceBonus = require('../models/performanceBonus.model');

// Lấy tất cả các mức thưởng
const getAllBonusesService = async () => {
    const bonuses = await PerformanceBonus.find().sort({ bonus_amount: -1 });
    return { status: 200, ok: true, message: "Lấy danh sách mức thưởng thành công.", data: bonuses };
};

// Tạo một mức thưởng mới
const createBonusService = async (bonusData) => {
    const { grade, bonus_amount, description } = bonusData;
    if (!grade || bonus_amount === undefined) {
        return { status: 400, ok: false, message: "Grade và bonus_amount là bắt buộc." };
    }
    const existingGrade = await PerformanceBonus.findOne({ grade });
    if (existingGrade) {
        return { status: 409, ok: false, message: `Hạng '${grade}' đã tồn tại.` };
    }
    const newBonus = await PerformanceBonus.create({ grade, bonus_amount, description });
    return { status: 201, ok: true, message: "Tạo mức thưởng mới thành công.", data: newBonus };
};

// Cập nhật một mức thưởng
const updateBonusService = async (grade, updateData) => {
    const { bonus_amount, description, is_active } = updateData;
    const updatedBonus = await PerformanceBonus.findOneAndUpdate(
        { grade },
        { bonus_amount, description, is_active },
        { new: true }
    );
    if (!updatedBonus) {
        return { status: 404, ok: false, message: `Không tìm thấy hạng '${grade}'.` };
    }
    return { status: 200, ok: true, message: `Cập nhật hạng '${grade}' thành công.`, data: updatedBonus };
};

// Xóa một mức thưởng
const deleteBonusService = async (grade) => {
    const deletedBonus = await PerformanceBonus.findOneAndDelete({ grade });
    if (!deletedBonus) {
        return { status: 404, ok: false, message: `Không tìm thấy hạng '${grade}'.` };
    }
    return { status: 200, ok: true, message: `Xóa hạng '${grade}' thành công.` };
};

module.exports = {
    getAllBonusesService,
    createBonusService,
    updateBonusService,
    deleteBonusService,
};