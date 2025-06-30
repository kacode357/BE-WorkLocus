// src/models/workplace.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const workplaceSchema = new Schema({
    // << THÊM TRƯỜNG MỚI VÀO ĐÂY >>
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
}, {
    timestamps: true,
});

const Workplace = mongoose.model('Workplace', workplaceSchema);
module.exports = Workplace;