require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Project = require("../models/project.model"); // Cần import model Project
const Task = require('../models/task.model.js');
/**
 * Middleware để xác thực token.
 */


const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ ok: false, message: "Yêu cầu token để xác thực." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password -refresh_token');

        if (!req.user) {
            return res.status(401).json({ ok: false, message: "Token hợp lệ nhưng không tìm thấy người dùng." });
        }

        next();
    } catch (error) {
        return res.status(401).json({ ok: false, message: "Token không hợp lệ hoặc đã hết hạn." });
    }
};

/**
 * Middleware để kiểm tra quyền admin.
 */
const checkAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ ok: false, message: "Truy cập bị từ chối. Yêu cầu quyền admin." });
    }
};

/**
 * Middleware để kiểm tra quyền Admin hoặc Project Manager.
 */
const checkAdminOrPM = (req, res, next) => {
    const userRole = req.user.role;
    if (userRole === 'admin' || userRole === 'project_manager') {
        next();
    } else {
        return res.status(403).json({
            status: 403,
            ok: false,
            message: "Bạn không có quyền thực hiện hành động này. Yêu cầu quyền Admin hoặc Project Manager.",
        });
    }
};

/**
 * Middleware để kiểm tra quyền tạo Task (Admin, PM, TL)
 */
const checkTaskCreationPermission = async (req, res, next) => {
    try {
        const user = req.user;
        const { project_id } = req.body;

        // << THAY ĐỔI LOGIC Ở ĐÂY >>

        // 1. Nếu là admin, cho qua luôn, không cần check gì thêm (quyền tối cao)
        if (user.role === 'admin') {
            return next();
        }

        // 2. Nếu là PM hoặc TL, check xem có thuộc dự án không
        if (user.role === 'project_manager' || user.role === 'team_leader') {
            if (!project_id) {
                return res.status(400).json({ ok: false, message: "Vui lòng cung cấp project_id." });
            }

            const project = await Project.findOne({
                _id: project_id,
                $or: [
                    { manager_id: user._id },
                    { members: user._id }
                ]
            });

            if (!project) {
                return res.status(403).json({ ok: false, message: "Bạn không có quyền tạo công việc trong dự án này." });
            }

            return next(); // Cho qua nếu check thành công
        }

        // 3. Nếu không phải các role trên, từ chối
        return res.status(403).json({ ok: false, message: "Bạn không có quyền tạo công việc." });

    } catch (error) {
        console.error("ERROR in checkTaskCreationPermission:", error);
        return res.status(500).json({ ok: false, message: "Lỗi hệ thống khi kiểm tra quyền." });
    }
};
const checkTaskCompletionPermission = async (req, res, next) => {
    try {
        const user = req.user;
        const taskId = req.params.id;

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ ok: false, message: "Không tìm thấy công việc." });
        }

        // Người được giao việc có quyền hoàn thành task
        if (task.assignee_id && task.assignee_id.equals(user._id)) {
            return next();
        }

        // << TAO XÓA 1 DÒNG BỊ LẶP Ở ĐÂY >>

        // Admin có quyền hoàn thành mọi task
        if (user.role === 'admin') {
            return next();
        }

        // Manager của dự án chứa task đó cũng có quyền
        const project = await Project.findById(task.project_id);
        if (project && project.manager_id.equals(user._id)) {
            return next();
        }

        return res.status(403).json({ ok: false, message: "Bạn không có quyền hoàn thành công việc này." });

    } catch (error) {
        return res.status(500).json({ ok: false, message: "Lỗi hệ thống khi kiểm tra quyền." });
    }
};
const checkProjectManagerOrAdmin = async (req, res, next) => {
    try {
        const user = req.user;
        // << SỬA LẠI ĐỂ LINH HOẠT HƠN >>
        // Lấy projectId từ param, dù tên nó là 'id' hay 'projectId'
        const projectId = req.params.id || req.params.projectId;

        if (!projectId) {
            return res.status(400).json({ ok: false, message: "Thiếu ID của dự án." });
        }

        if (user.role === 'admin') {
            return next();
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ ok: false, message: "Không tìm thấy dự án." });
        }

        if (project.manager_id.equals(user._id)) {
            return next();
        }

        return res.status(403).json({ ok: false, message: "Chỉ quản lý của dự án hoặc Admin mới có quyền này." });

    } catch (error) {
        return res.status(500).json({ ok: false, message: "Lỗi hệ thống khi kiểm tra quyền." });
    }
};
const checkTaskManagementPermission = async (req, res, next) => {
    try {
        const user = req.user;
        const taskId = req.params.id;

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ ok: false, message: "Không tìm thấy công việc." });
        }

        // Admin có toàn quyền
        if (user.role === 'admin') {
            return next();
        }

        // Manager của dự án chứa task đó có quyền
        const project = await Project.findById(task.project_id);
        if (project && project.manager_id.equals(user._id)) {
            return next();
        }

        return res.status(403).json({ ok: false, message: "Bạn không có quyền thực hiện hành động này trên công việc." });

    } catch (error) {
        return res.status(500).json({ ok: false, message: "Lỗi hệ thống khi kiểm tra quyền." });
    }
};
module.exports = {
    verifyToken,
    checkAdmin,
    checkAdminOrPM,
    checkTaskCreationPermission,
    checkTaskCompletionPermission,
    checkProjectManagerOrAdmin,
    checkTaskManagementPermission
};