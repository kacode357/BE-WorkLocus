// File: src/server.js (PHIÊN BẢN "HYBRID" - CHẠY ĐƯỢC CẢ LOCAL VÀ VERCEL)

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDb = require("./config/database");
const apiRoutes = require("./routes/api");
const checkMaintenanceMode = require('../src/middleware/maintenance');

const app = express();

// --- CÁC CẤU HÌNH MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// --- MIDDLEWARE KẾT NỐI DATABASE ---
app.use(async (req, res, next) => {
  try {
    await connectDb();
    next();
  } catch (error) {
    console.error(">>> LỖI KẾT NỐI DATABASE:", error);
    res.status(503).json({
      message: "Service Unavailable: Không thể kết nối tới database.",
    });
  }
});

// --- MIDDLEWARE KIỂM TRA CHẾ ĐỘ BẢO TRÌ ---
app.use(checkMaintenanceMode);

// --- SỬ DỤNG ROUTER CHÍNH ---
app.use("/", apiRoutes);


// --- EXPORT APP CHO VERCEL ---
// Dòng này để khi deploy lên Vercel, nó sẽ dùng app này
module.exports = app;


// >>> PHẦN THÊM VÀO ĐỂ CHẠY VỚI NODEMON <<<
// Khối code này sẽ chỉ chạy khi mày đang ở môi trường dev (trên máy mày)
// Nó sẽ KHÔNG chạy khi deploy lên Vercel.
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 8888;
  app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy local cho mục đích test tại http://localhost:${PORT}`);
    console.log("Giờ mày có thể dùng Postman để gọi API được rồi đó.");
    console.log("Nhấn CTRL + C để dừng server.");
  });
}