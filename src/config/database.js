// File: config/database.js (PHIÊN BẢN CÓ LOG ĐẦY ĐỦ HƠN)

const mongoose = require('mongoose');

const MONGO_DB_URL = process.env.MONGO_DB_URL;

if (!MONGO_DB_URL) {
  throw new Error(
    'Vui lòng định nghĩa biến MONGO_DB_URL bên trong file .env của mày'
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDb() {
  if (cached.conn) {
    // LOG KHI DÙNG LẠI KẾT NỐI CŨ
    console.log("🚀 Dùng lại kết nối database đã cache!");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    
    // LOG KHI BẮT ĐẦU TẠO KẾT NỐI MỚI
    console.log("✨ Bắt đầu tạo một kết nối database mới...");
    cached.promise = mongoose.connect(MONGO_DB_URL, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    // >>> DÒNG LOG MỚI TAO THÊM VÀO ĐÂY <<<
    // LOG KHI KẾT NỐI MỚI ĐÃ THÀNH CÔNG
    console.log("✅ Kết nối mới đã được thiết lập và cache lại thành công.");

  } catch (e) {
    cached.promise = null;
    throw e;
  }
  
  return cached.conn;
}

module.exports = connectDb;