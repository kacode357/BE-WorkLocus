// File: services/performanceBonus.service.js
const PerformanceBonus = require('../models/performanceBonus.model');

// Lấy tất cả các mức thưởng
const searchBonusesService = async ({ searchCondition, pageInfo }) => {
    try {
        // Lấy các tham số từ request body
        const { keyword, is_active } = searchCondition || {}; // Sửa is_activated thành is_active cho khớp model
        const { pageNum, pageSize } = pageInfo || {};

        // Cài đặt phân trang
        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        // Xây dựng điều kiện truy vấn
        const queryConditions = {};

        // 1. Lọc theo trạng thái active/inactive
        if (typeof is_active === 'boolean') {
            queryConditions.is_active = is_active;
        }

        // 2. Tìm kiếm theo keyword (tìm trong 'grade' và 'description')
        if (keyword) {
            const searchRegex = { $regex: keyword, $options: 'i' }; // 'i' để không phân biệt hoa thường
            queryConditions.$or = [
                { grade: searchRegex },
                { description: searchRegex }
            ];
        }

        // Thực hiện truy vấn
        const totalRecords = await PerformanceBonus.countDocuments(queryConditions);
        const records = await PerformanceBonus.find(queryConditions)
            .sort({ bonus_amount: -1 }) // Vẫn giữ sort theo mức thưởng giảm dần
            .skip(skip)
            .limit(limit);

        return {
            status: 200, ok: true, message: "Tìm kiếm mức thưởng thành công.",
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
        console.error("ERROR in searchBonusesService:", error);
        // Giả sử mày có GENERAL_MESSAGES
        return { status: 500, ok: false, message: "Lỗi hệ thống khi tìm kiếm mức thưởng." };
    }
}

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
    searchBonusesService,
    createBonusService,
    updateBonusService,
    deleteBonusService,
};