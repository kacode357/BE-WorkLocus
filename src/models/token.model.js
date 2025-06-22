const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  token: {
    type: String,
    required: true,
  },
  // Token sẽ tự động bị xóa sau 10 phút
  created_at: {
    type: Date,
    default: Date.now,
    expires: 600, // 600 giây = 10 phút
  },
});

module.exports = mongoose.model("Token", tokenSchema);