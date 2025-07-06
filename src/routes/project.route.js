// File: src/routes/project.route.js
const express = require("express");
const router = express.Router();
const ProjectController = require("../controllers/project.controller.js");
const { verifyToken, checkAdminOrPM, checkProjectManagerOrAdmin,  } = require("../middleware/auth.js");

router.delete(
    "/:projectId/members/:userId",
    [verifyToken, checkProjectManagerOrAdmin], // Dùng lại middleware vừa sửa
    ProjectController.removeMemberFromProjectController
);

router.put(
    "/:id",
    [verifyToken, checkProjectManagerOrAdmin],
    ProjectController.updateProjectController
);

router.delete(
    "/:id",
    [verifyToken, checkProjectManagerOrAdmin],
    ProjectController.softDeleteProjectController
);

router.post(
    "/",
    [verifyToken, checkAdminOrPM],
    ProjectController.createProjectController
);

router.post(
    "/search", // Dùng /search cho rõ ràng
    verifyToken, // Vẫn cần check đăng nhập
    ProjectController.searchProjectsController
);
router.patch(
    "/:id/join",
    verifyToken, // Cần biết user là ai để thêm vào
    ProjectController.joinProjectController
);
router.patch(
    "/:id/complete",
    [verifyToken, checkProjectManagerOrAdmin],
    ProjectController.completeProjectController
);
module.exports = router;