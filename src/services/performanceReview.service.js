// ... các dòng import giữ nguyên ...
const PerformanceReview = require('../models/performanceReview.model');
const User = require('../models/user.model');
const { REVIEW_MESSAGES } = require('../constants/performanceReview.messages');
const { ADMIN_MESSAGES } = require('../constants/admin.messages');
const { GENERAL_MESSAGES } = require('../constants/auth.messages');


// << BẮT ĐẦU SỬA TỪ ĐÂY >>
/**
 * Tạo hoặc cập nhật đánh giá hiệu quả cho nhân viên trong tháng
 */
const createOrUpdateReviewService = async (reviewData) => { // SỬA 1: Nhận cả object reviewData
    try {
        // SỬA 2: Bóc tách (destructure) ở bên trong, thêm || {} để an toàn tuyệt đối
        const { user_id, month, year, grade, notes } = reviewData || {}; 

        // Các logic check điều kiện vẫn giữ nguyên
        if (!user_id || !month || !year || !grade) {
            return { status: 400, ok: false, message: REVIEW_MESSAGES.INFO_MISSING };
        }

        const userExists = await User.findById(user_id);
        if (!userExists || userExists.is_deleted) {
            return { status: 404, ok: false, message: ADMIN_MESSAGES.USER_NOT_FOUND };
        }

        // Dữ liệu để cập nhật không đổi
        const dataToUpdate = { user_id, month, year, grade, notes };

        const review = await PerformanceReview.findOneAndUpdate(
            { user_id, month, year }, 
            dataToUpdate,              
            { new: true, upsert: true } 
        ).populate('user_id', 'full_name email');

        return { status: 200, ok: true, message: REVIEW_MESSAGES.CREATE_UPDATE_SUCCESS, data: review };

    } catch (error) {
        console.error("ERROR in createOrUpdateReviewService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
};
// << KẾT THÚC SỬA >>


// Hàm getReviewsService giữ nguyên, không cần sửa
const getReviewsService = async ({ searchCondition, pageInfo }) => {
    // ... code hàm này giữ nguyên ...
    try {
        const { user_id, month, year } = searchCondition || {};
        const { pageNum, pageSize } = pageInfo || {};

        const page = parseInt(pageNum) || 1;
        const limit = parseInt(pageSize) || 10;
        const skip = (page - 1) * limit;

        const queryConditions = {};
        if (user_id) queryConditions.user_id = user_id;
        if (month) queryConditions.month = month;
        if (year) queryConditions.year = year;

        const totalRecords = await PerformanceReview.countDocuments(queryConditions);
        const records = await PerformanceReview.find(queryConditions)
            .populate('user_id', 'full_name email image_url')
            .sort({ year: -1, month: -1, updated_at: -1 })
            .skip(skip)
            .limit(limit);

        return {
            status: 200, ok: true, message: REVIEW_MESSAGES.GET_REVIEWS_SUCCESS,
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
        console.error("ERROR in getReviewsService:", error);
        return { status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR };
    }
}


module.exports = {
    createOrUpdateReviewService,
    getReviewsService,
};