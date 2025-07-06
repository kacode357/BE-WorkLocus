const BonusService = require('../services/performanceBonus.service');
const { GENERAL_MESSAGES } = require("../constants/auth.messages");

const handleRequest = async (serviceCall, res) => {
    try {
        const result = await serviceCall();
        return res.status(result.status).json(result);
    } catch (error) {
        console.error("ERROR in PerformanceBonus controller:", error);
        return res.status(500).json({ status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR });
    }
};

const searchBonuses = (req, res) => {
    const { searchCondition, pageInfo } = req.body;
    handleRequest(() => BonusService.searchBonusesService({ searchCondition, pageInfo }), res);
};

const createBonus = (req, res) => {
    handleRequest(() => BonusService.createBonusService(req.body), res);
};

const updateBonus = (req, res) => {
    // << SỬA LẠI ĐÂY >>
    handleRequest(() => BonusService.updateBonusService(req.params.id, req.body), res);
};

const softDeleteBonus = (req, res) => {
    // << SỬA LẠI ĐÂY >>
    handleRequest(() => BonusService.softDeleteBonusService(req.params.id), res);
};

module.exports = {
    searchBonuses,
    createBonus,
    updateBonus,
    softDeleteBonus,
};