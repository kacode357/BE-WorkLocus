// File: src/controllers/task.controller.js
const TaskService = require("../services/task.service.js");
const { GENERAL_MESSAGES } = require("../constants/auth.messages.js");

const completeTaskController = (req, res) => {
    handleRequest(() => TaskService.completeTaskService({
        taskId: req.params.id,
    }), res);
};

const searchAvailableTasksController = (req, res) => {
    const { searchCondition = {}, pageInfo = {} } = req.body;
    handleRequest(() => TaskService.searchTasksService({
        user: req.user,
        searchCondition,
        pageInfo
    }), res);
};

const joinTaskController = (req, res) => {
    handleRequest(() => TaskService.joinTaskService({
        taskId: req.params.id,
        user: req.user,
    }), res);
};

const handleRequest = async (serviceCall, res) => {
    try {
        const result = await serviceCall();
        return res.status(result.status).json(result);
    } catch (error) {
        console.error("ERROR in task controller:", error);
        return res.status(500).json({ ok: false, message: GENERAL_MESSAGES.SYSTEM_ERROR });
    }
};

const createTaskController = (req, res) => {
    handleRequest(() => TaskService.createTaskService({
        taskData: req.body,
        reporter: req.user, // Người tạo việc lấy từ token
    }), res);
};
const softDeleteTaskController = (req, res) => {
    handleRequest(() => TaskService.softDeleteTaskService({
        taskId: req.params.id,
    }), res);
};
const updateTaskController = (req, res) => {
    handleRequest(() => TaskService.updateTaskService({
        taskId: req.params.id,
        updateData: req.body
    }), res);
};
module.exports = {
    updateTaskController,
    softDeleteTaskController,
    searchAvailableTasksController,
    joinTaskController,
    createTaskController,
    completeTaskController,
};