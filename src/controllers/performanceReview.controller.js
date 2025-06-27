// File: controllers/performanceReview.controller.js

const ReviewService = require("../services/performanceReview.service");
const { GENERAL_MESSAGES } = require("../constants/auth.messages");

// Khuôn xử lý request chung, không có gì thay đổi
const handleRequest = async (serviceCall, res) => {
    try {
        const result = await serviceCall();
        return res.status(result.status).json(result);
    } catch (error) {
        // Thay đổi message log một chút để biết lỗi từ controller nào
        console.error("ERROR in PerformanceReview controller:", error);
        return res.status(500).json({
            status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR,
        });
    }
};

// Controller để admin tạo hoặc cập nhật đánh giá
// File: controllers/performanceReview.controller.js
const createOrUpdateReviewController = (req, res) => {
    const reviewData = req.body;
    console.log("Received review data:", reviewData); // << DÒNG NÀY LÀ CHÌA KHÓA
    handleRequest(() => ReviewService.createOrUpdateReviewService(reviewData), res);
};

// Controller để lấy danh sách đánh giá
const getReviewsController = (req, res) => {
    // Lấy các tham số lọc và phân trang từ req.query
    const { user_id, month, year, pageNum, pageSize } = req.query;
    handleRequest(() => ReviewService.getReviewsService({ 
        searchCondition: { user_id, month, year }, 
        pageInfo: { pageNum, pageSize } 
    }), res);
};

module.exports = {
    createOrUpdateReviewController,
    getReviewsController,
};