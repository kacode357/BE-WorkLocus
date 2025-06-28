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
    try {
        const { grade, bonus_amount, description } = bonusData;
        if (!grade || bonus_amount === undefined) {
            return { status: 400, ok: false, message: "Grade và bonus_amount là bắt buộc." };
        }

        // Bước 1: Tìm xem có hạng nào trùng tên không, bất kể trạng thái active
        const existingGrade = await PerformanceBonus.findOne({ grade: grade.toUpperCase() });

        if (existingGrade) {
            // Bước 2a: Nếu tìm thấy và nó đang active, báo lỗi như cũ
            if (existingGrade.is_active) {
                return { status: 409, ok: false, message: `Hạng '${grade}' đã tồn tại và đang hoạt động.` };
            } else {
                // Bước 2b: Nếu tìm thấy nhưng nó đang INACTIVE (đã bị xóa mềm)
                // -> "Hồi sinh" nó bằng cách cập nhật lại thông tin và set is_active = true
                const reactivatedBonus = await PerformanceBonus.findOneAndUpdate(
                    { grade: grade.toUpperCase() },
                    {
                        $set: {
                            bonus_amount: bonus_amount,
                            description: description,
                            is_active: true // Kích hoạt lại
                        }
                    },
                    { new: true } // Trả về document sau khi đã cập nhật
                );
                return { status: 200, ok: true, message: `Hạng '${grade}' đã được khôi phục và cập nhật thành công.`, data: reactivatedBonus };
            }
        } else {
            // Bước 3: Nếu không tìm thấy bất kỳ hạng nào trùng tên, tạo mới hoàn toàn
            const newBonus = await PerformanceBonus.create({
                grade: grade.toUpperCase(),
                bonus_amount,
                description
            });
            return { status: 201, ok: true, message: "Tạo mức thưởng mới thành công.", data: newBonus };
        }
    } catch (error) {
        console.error("ERROR in createBonusService:", error);
        return { status: 500, ok: false, message: "Lỗi hệ thống khi tạo mức thưởng." };
    }
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
const softDeleteBonusService = async (grade) => {
    try {
        // Tìm một hạng đang active và cập nhật nó thành inactive
        const deactivatedBonus = await PerformanceBonus.findOneAndUpdate(
            { grade: grade, is_active: true }, // Chỉ "xóa" những cái đang active
            { $set: { is_active: false } },    // Hành động: set is_active = false
            { new: true }                      // Trả về document sau khi update
        );

        if (!deactivatedBonus) {
            return { status: 404, ok: false, message: `Không tìm thấy hạng '${grade}' đang hoạt động để vô hiệu hóa.` };
        }
        
        // Đổi message cho đúng với hành động
        return { status: 200, ok: true, message: `Vô hiệu hóa hạng '${grade}' thành công.` };
    } catch(error) {
         console.error("ERROR in softDeleteBonusService:", error);
         return { status: 500, ok: false, message: "Lỗi hệ thống khi vô hiệu hóa mức thưởng." };
    }
};

module.exports = {
    searchBonusesService,
    createBonusService,
    updateBonusService,
    softDeleteBonusService,
};