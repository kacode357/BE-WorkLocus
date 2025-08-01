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

const searchUsersController = (req, res) => {
    handleRequest(() => AdminService.searchUsersService(req.body), res);
};
const getDashboardStatsController = (req, res) => {
    handleRequest(() => AdminService.getDashboardStatsService(), res);
};
const updateEmployeeSalaryController = (req, res) => {
    handleRequest(() => AdminService.updateEmployeeSalaryService({
        userIdToUpdate: req.params.id,
        salaryData: req.body,
    }), res);
};
const getEmployeeDetailsByIdController = (req, res) => {
    handleRequest(() => AdminService.getEmployeeDetailsByIdService({ 
        userIdToView: req.params.id // Lấy id từ URL
    }), res);
};
const createWorkplaceController = (req, res) => {
    handleRequest(() => AdminService.createWorkplaceService(req.body), res);
};

const searchWorkplacesController = (req, res) => {
    handleRequest(() => AdminService.searchWorkplacesService({ pageInfo: req.body.pageInfo }), res);
};

const updateWorkplaceByIdController = (req, res) => {
    handleRequest(() => AdminService.updateWorkplaceByIdService({
        workplaceId: req.params.id,
        updateData: req.body
    }), res);
};

const deleteWorkplaceController = (req, res) => {
    handleRequest(() => AdminService.deleteWorkplaceService({ workplaceId: req.params.id }), res);
};

const createPMByAdminController = (req, res) => {
    handleRequest(() => AdminService.createPMByAdminService(req.body), res);
};

const createTLByAdminController = (req, res) => {
    handleRequest(() => AdminService.createTLByAdminService(req.body), res);
};
const searchAllProjectsController = (req, res) => {
    const { searchCondition = {}, pageInfo = {} } = req.body;
    handleRequest(() => AdminService.searchAllProjectsService({
        searchCondition,
        pageInfo
    }), res);
};
const searchAllTasksController = (req, res) => {
    const { searchCondition = {}, pageInfo = {} } = req.body;
    handleRequest(() => AdminService.searchAllTasksService({
        searchCondition,
        pageInfo
    }), res);
};
const updateMaintenanceModeController = (req, res) => {
    handleRequest(() => AdminService.updateMaintenanceModeService(req.body), res);
};
const addMemberToProjectController = (req, res) => {
    const { projectId } = req.params; 
    const { userId } = req.body; 
    handleRequest(() => AdminService.addMemberToProjectService({ projectId, userId }), res);
};
const searchProjectMembersController = (req, res) => {
    const { projectId } = req.params; // Lấy projectId từ URL params
    const { searchCondition = {}, pageInfo = {} } = req.body; // Lấy điều kiện tìm kiếm và phân trang từ body
    handleRequest(() => AdminService.searchProjectMembersService({
        projectId,
        searchCondition,
        pageInfo
    }), res);
};
const getSystemSettingsController = (req, res) => {
    handleRequest(() => AdminService.getSystemSettingsService(), res);
};
const updateUserRoleController = (req, res) => {
    handleRequest(() => AdminService.updateUserRoleService({
        userIdToUpdate: req.params.id,
        newRole: req.body.role,
        adminId: req.user._id.toString(),
    }), res);
};
const getProjectTaskStatsController = (req, res) => {
    handleRequest(() => AdminService.getProjectTaskStatsService({
        searchCondition: req.body.searchCondition,
        pageInfo: req.body.pageInfo
    }), res);
};

const getEmployeeAverageHoursController = (req, res) => {
    handleRequest(() => AdminService.getEmployeeAverageHoursService({
        searchCondition: req.body.searchCondition,
        pageInfo: req.body.pageInfo,
        date_from: req.body.date_from,
        date_to: req.body.date_to
    }), res);
};

const getProjectsHealthDashboardController = (req, res) => {
    handleRequest(() => AdminService.getProjectsHealthDashboardService({
        searchCondition: req.body.searchCondition,
        pageInfo: req.body.pageInfo
    }), res);
};
module.exports = {
    getProjectTaskStatsController,
    getEmployeeAverageHoursController,
    getProjectsHealthDashboardController,
    updateUserRoleController,
    getSystemSettingsController,
    searchProjectMembersController,
    addMemberToProjectController,
    updateMaintenanceModeController,
    searchAllTasksController,
    searchAllProjectsController,
    getDashboardStatsController,
    searchUsersController,
    blockUserController,
    unblockUserController,
    softDeleteUserController,
    adminChangePasswordController,
    createAdminAccountController,
    createEmployeeByAdminController,
    createPMByAdminController,
    createTLByAdminController,
    searchAllAttendancesController,
    updateEmployeeSalaryController,
    getEmployeeDetailsByIdController,
    createWorkplaceController,
    searchWorkplacesController,
    updateWorkplaceByIdController,
    deleteWorkplaceController,
};
