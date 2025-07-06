// src/models/workplace.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const workplaceSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    latitude: {
        type: Number,
        required: true,
    },
    longitude: {
        type: Number,
        required: true,
    },
    // << THÊM TRƯỜNG MỚI ĐỂ XOÁ MỀM >>
    is_deleted: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

const Workplace = mongoose.model('Workplace', workplaceSchema);
module.exports = Workplace;