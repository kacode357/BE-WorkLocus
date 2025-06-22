const AdminService = require("../services/admin.service.js");
const { GENERAL_MESSAGES } = require("../constants/auth.messages.js");

const handleRequest = async (serviceCall, res) => {
    try {
        const result = await serviceCall();
        return res.status(result.status).json(result);
    } catch (error) {
        console.error("ERROR in admin controller:", error);
        return res.status(500).json({
            status: 500,
            ok: false,
            message: GENERAL_MESSAGES.SYSTEM_ERROR,
        });
    }
};

const blockUserController = (req, res) => {
    const { reason } = req.body;
    handleRequest(() => AdminService.blockUserService({
        userIdToBlock: req.params.id,
        adminId: req.user._id.toString(),
        reason,
    }), res);
};

const unblockUserController = (req, res) => {
    handleRequest(() => AdminService.unblockUserService({ userIdToUnblock: req.params.id }), res);
};

const softDeleteUserController = (req, res) => {
    handleRequest(() => AdminService.softDeleteUserService({
        userIdToDelete: req.params.id,
        adminId: req.user._id.toString(),
    }), res);
};

const adminChangePasswordController = (req, res) => {
    handleRequest(() => AdminService.adminChangePasswordService({
        userIdToChange: req.params.id,
        newPassword: req.body.newPassword,
        adminId: req.user._id.toString(),
    }), res);
};

const createAdminAccountController = (req, res) => {
    handleRequest(() => AdminService.createAdminAccountService(req.body), res);
};

const createEmployeeByAdminController = (req, res) => {
    handleRequest(() => AdminService.createEmployeeByAdminService(req.body), res);
};

const searchAllAttendancesController = (req, res) => {
    handleRequest(() => AdminService.searchAllAttendancesService(req.body), res);
};

const searchWorkReportsController = (req, res) => {
    handleRequest(() => AdminService.searchWorkReportsService(req.body), res);
};

module.exports = {
    blockUserController,
    unblockUserController,
    softDeleteUserController,
    adminChangePasswordController,
    createAdminAccountController,
    createEmployeeByAdminController,
    searchAllAttendancesController,
    searchWorkReportsController,
};
