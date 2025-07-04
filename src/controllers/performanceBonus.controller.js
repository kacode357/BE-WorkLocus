const BonusService = require('../services/performanceBonus.service');
const { GENERAL_MESSAGES } = require("../constants/auth.messages");

// Helper function này vẫn giữ nguyên
const handleRequest = async (serviceCall, res) => {
    try {
        const result = await serviceCall();
        return res.status(result.status).json(result);
    } catch (error) {
        console.error("ERROR in PerformanceBonus controller:", error);
        return res.status(500).json({ status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR });
    }
};


// << BƯỚC 1: ĐỊNH NGHĨA TẤT CẢ CÁC HÀM CONTROLLER NHƯ NHỮNG HẰNG SỐ >>

const searchBonuses = (req, res) => {
    // Lấy searchCondition và pageInfo từ body của request POST
    const { searchCondition, pageInfo } = req.body;
    handleRequest(() => BonusService.searchBonusesService({ searchCondition, pageInfo }), res);
};

const createBonus = (req, res) => {
    handleRequest(() => BonusService.createBonusService(req.body), res);
};

const updateBonus = (req, res) => {
    handleRequest(() => BonusService.updateBonusService(req.params.grade.toUpperCase(), req.body), res);
};

const softDeleteBonus = (req, res) => {
    handleRequest(() => BonusService.softDeleteBonusService(req.params.grade.toUpperCase()), res);
};

// << BƯỚC 2: EXPORT TẤT CẢ RA NGOÀI TRONG MỘT OBJECT DUY NHẤT >>
// Cách này nhất quán và được khuyến khích
module.exports = {
    searchBonuses,
    createBonus,
    updateBonus,
    softDeleteBonus,
};