// File: src/middleware/maintenance.js
const jwt = require('jsonwebtoken');
const Setting = require('../models/setting.model.js');

const checkMaintenanceMode = async (req, res, next) => {
    try {
        const settings = await Setting.findOne({});

        // Nếu chế độ bảo trì đang bật
        if (settings && settings.is_maintenance_mode) {
            // Kiểm tra xem user có phải là admin không
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    // Nếu là admin, cho phép đi qua
                    if (decoded.role === 'admin') {
                        return next();
                    }
                } catch (err) {
                    // Token sai nhưng vẫn đang bảo trì -> chặn
                }
            }
            
            // Đối với tất cả các user khác (không phải admin hoặc không có token), chặn lại
            return res.status(503).json({ // 503 Service Unavailable
                ok: false,
                is_maintenance: true,
                message: settings.maintenance_message,
            });
        }

        // Nếu chế độ bảo trì tắt, cho tất cả request đi qua
        return next();

    } catch (error) {
        // Nếu có lỗi khi check DB, tạm thời cho qua để hệ thống không chết
        console.error("ERROR checking maintenance mode:", error);
        return next();
    }
};

module.exports = checkMaintenanceMode;