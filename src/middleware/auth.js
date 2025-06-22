require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Middleware để xác thực token.
 * Sẽ xác thực token và gắn thông tin user vào req.user.
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

        next(); // Token hợp lệ, cho phép request đi tiếp
    } catch (error) {
        return res.status(401).json({ ok: false, message: "Token không hợp lệ hoặc đã hết hạn." });
    }
};

/**
 * Middleware để kiểm tra quyền admin.
 * **QUAN TRỌNG**: Phải được sử dụng SAU verifyToken.
 */
const checkAdmin = (req, res, next) => {
   
    // req.user đã được gắn từ middleware verifyToken
    if (req.user && req.user.role === 'admin') {
        // Nếu đúng là admin, cho đi tiếp
        next(); 
    } else {
        // Nếu không phải admin, trả về lỗi 403 Forbidden và DỪNG request lại
        return res.status(403).json({ ok: false, message: "Truy cập bị từ chối. Yêu cầu quyền admin." });
    }
};

module.exports = {
    verifyToken,
    checkAdmin,
};