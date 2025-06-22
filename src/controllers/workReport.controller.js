const WorkReportService = require("../services/workReport.service");
const { GENERAL_MESSAGES } = require("../constants/auth.messages");

const handleRequest = async (serviceCall, res) => {
    try {
        const result = await serviceCall();
        return res.status(result.status).json(result);
    } catch (error) {
        console.error("ERROR in workReport controller:", error);
        return res.status(500).json({
            status: 500,
            ok: false,
            message: GENERAL_MESSAGES.SYSTEM_ERROR,
        });
    }
};

const createWorkReportController = (req, res) => {
    handleRequest(() => WorkReportService.createWorkReportService({
        userId: req.user._id,
        reportData: req.body,
    }), res);
};

const getMyTodaysReportsController = (req, res) => {
    handleRequest(() => WorkReportService.getMyTodaysReportsService({ userId: req.user._id }), res);
};

const updateWorkReportController = (req, res) => {
    handleRequest(() => WorkReportService.updateWorkReportService({
        reportId: req.params.id,
        userId: req.user._id,
        updateData: req.body,
    }), res);
};

const deleteWorkReportController = (req, res) => {
    handleRequest(() => WorkReportService.deleteWorkReportService({
        reportId: req.params.id,
        userId: req.user._id,
    }), res);
};

module.exports = {
    createWorkReportController,
    getMyTodaysReportsController,
    updateWorkReportController,
    deleteWorkReportController,
};
