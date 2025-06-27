// File: src/server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDb = require("./config/database");
const apiRoutes = require("./routes/api");

const app = express();

// --- CÁC CẤU HÌNH MIDDLEWARE ---
// Các middleware này phải được đặt ở trên cùng
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// --- XÓA BỎ MIDDLEWARE KẾT NỐI DB CŨ ---
// Mình sẽ không kết nối DB trên mỗi request nữa.


// --- SỬ DỤNG ROUTER CHÍNH ---
// Toàn bộ request sẽ được chuyển qua file api.js để xử lý
app.use("/", apiRoutes);


// --- EXPORT APP CHO VERCEL ---
// Vercel sẽ tự động dùng app này và xử lý việc khởi chạy server
module.exports = app;


// >>> PHẦN CHẠY LOCAL VỚI NODEMON <<<
// Khối code này chỉ chạy trên máy mày, Vercel sẽ bỏ qua
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 8888;

    // Chỉ giữ lại MỘT app.listen duy nhất
    // Kết nối DB một lần duy nhất, sau đó mới khởi động server
    app.listen(PORT, async () => {
        try {
            await connectDb();
            console.log("✅ Kết nối Database thành công!");
            console.log(`🚀 Server đang chạy local cho mục đích test tại http://localhost:${PORT}`);
            console.log("Giờ mày có thể dùng Postman để gọi API được rồi đó.");
            console.log("Nhấn CTRL + C để dừng server.");
        } catch (error) {
            console.error("❌ LỖI KHỞI ĐỘNG SERVER:", error);
            process.exit(1); // Dừng hẳn server nếu không kết nối được DB
        }
    });
}