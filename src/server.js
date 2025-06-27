// File: src/server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDb = require("./config/database");
const apiRoutes = require("./routes/api");

const app = express();

// --- CÁC CẤU HÌNH MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// --- SỬ DỤNG ROUTER CHÍNH ---
// Xóa middleware kết nối DB ở đây và đặt router lên trên
app.use("/", apiRoutes);


// --- EXPORT APP CHO VERCEL ---
module.exports = app;


// >>> PHẦN THÊM VÀO ĐỂ CHẠY VỚI NODEMON <<<
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 8888;

  // << SỬA Ở ĐÂY >>
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