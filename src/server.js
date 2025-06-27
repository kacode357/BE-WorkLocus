require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDb = require("./config/database");
const apiRoutes = require("./routes/api");

const app = express();

// << BƯỚC 1: KẾT NỐI DATABASE NGAY LẬP TỨC >>
// Đặt ở đây để nó chạy ngay khi Vercel khởi tạo serverless function
// và cũng chạy ngay khi mày chạy local.
connectDb();

// --- CÁC CẤU HÌNH MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- SỬ DỤNG ROUTER CHÍNH ---
app.use("/", apiRoutes);

// --- EXPORT APP CHO VERCEL ---
// Vercel sẽ dùng app đã được cấu hình ở trên
module.exports = app;

// >>> PHẦN CHẠY LOCAL VỚI NODEMON <<<
// Khối này chỉ để khởi động server trên máy mày
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 8888;
    
    // << BƯỚC 2: Bỏ await connectDb() ở đây đi vì nó đã được gọi ở trên >>
    app.listen(PORT, () => {
        // Chỉ cần log ra là server đã chạy
        console.log(`🚀 Server đang chạy local cho mục đích test tại http://localhost:${PORT}`);
    });
}