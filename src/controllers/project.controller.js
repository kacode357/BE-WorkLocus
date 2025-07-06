// File: src/controllers/project.controller.js
const ProjectService = require("../services/project.service.js");
const { GENERAL_MESSAGES } = require("../constants/auth.messages.js");

const joinProjectController = (req, res) => {
    handleRequest(() => ProjectService.joinProjectService({
        projectId: req.params.id, // Lấy ID dự án từ URL
        user: req.user,           // Lấy user từ token
    }), res);
};

const handleRequest = async (serviceCall, res) => {
    try {
        const result = await serviceCall();
        return res.status(result.status).json(result);
    } catch (error) {
        console.error("ERROR in project controller:", error);
        return res.status(500).json({
            status: 500,
            ok: false,
            message: GENERAL_MESSAGES.SYSTEM_ERROR,
        });
    }
};

const createProjectController = (req, res) => {
    handleRequest(() => ProjectService.createProjectService({
        projectData: req.body, // Dữ liệu dự án từ body
        creator: req.user,     // Người tạo dự án từ token (được gắn bởi middleware verifyToken)
    }), res);
};
const searchProjectsController = (req, res) => {
    // Lấy searchCondition và pageInfo từ body
    const { searchCondition = {}, pageInfo = {} } = req.body;
    
    handleRequest(() => ProjectService.searchProjectsForEmployeeService({
        user: req.user,
        searchCondition,
        pageInfo,
    }), res);
};
const completeProjectController = (req, res) => {
    handleRequest(() => ProjectService.completeProjectService({
        projectId: req.params.id,
    }), res);
};
const softDeleteProjectController = (req, res) => {
    handleRequest(() => ProjectService.softDeleteProjectService({
        projectId: req.params.id,
    }), res);
};
const updateProjectController = (req, res) => {
    handleRequest(() => ProjectService.updateProjectService({
        projectId: req.params.id,
        updateData: req.body,
    }), res);
};
const removeMemberFromProjectController = (req, res) => {
    handleRequest(() => ProjectService.removeMemberFromProjectService({
        projectId: req.params.projectId,
        userIdToRemove: req.params.userId,   
    }), res);
};
module.exports = {
    removeMemberFromProjectController,
    updateProjectController,
    softDeleteProjectController,
    joinProjectController,
    searchProjectsController,
    createProjectController,
    completeProjectController,
};