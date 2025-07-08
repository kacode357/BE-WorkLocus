// File: src/routes/task.route.js
const express = require("express");
const router = express.Router();
const TaskController = require("../controllers/task.controller.js");
const { verifyToken, checkTaskCreationPermission, checkTaskCompletionPermission, checkTaskManagementPermission } = require("../middleware/auth.js");

router.delete(
    "/:id",
    [verifyToken, checkTaskManagementPermission],
    TaskController.softDeleteTaskController
);

router.patch(
    "/:id/complete",
    [verifyToken, checkTaskCompletionPermission],
    TaskController.completeTaskController
);

router.post(
    "/search",
    verifyToken, // Cần biết user là ai để tìm đúng việc
    TaskController.searchAvailableTasksController
);

router.post(
    "/",
    [verifyToken, checkTaskCreationPermission],
    TaskController.createTaskController
);
router.patch(
    "/:id/join",
    verifyToken,
    TaskController.joinTaskController
);

router.put(
    "/:id",
    [verifyToken, checkTaskManagementPermission],
    TaskController.updateTaskController
);

module.exports = router;