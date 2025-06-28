// File: controllers/payroll.controller.js

const PayrollService = require("../services/payroll.service");
const { GENERAL_MESSAGES } = require("../constants/auth.messages");

const handleRequest = async (serviceCall, res) => {
    try {
        const result = await serviceCall();
        return res.status(result.status).json(result);
    } catch (error) {
        console.error("ERROR in payroll controller:", error);
        return res.status(500).json({
            status: 500, ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR,
        });
    }
};

// Controller để tính lương
const calculatePayrollController = (req, res) => {
    // Toàn bộ body chứa các tham số tính lương
    const payrollInput = req.body;
    handleRequest(() => PayrollService.calculatePayrollService(payrollInput), res);
};

// Controller để lấy lịch sử lương
const searchPayrollsController = (req, res) => {
    const { searchCondition, pageInfo } = req.body;
    handleRequest(() => PayrollService.searchPayrollsService({
        searchCondition,
        pageInfo
    }), res);
};

module.exports = {
    calculatePayrollController,
    searchPayrollsController,
};