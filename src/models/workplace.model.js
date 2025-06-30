// src/models/workplace.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const workplaceSchema = new Schema({
    latitude: {
        type: Number,
        required: true,
    },
    longitude: {
        type: Number,
        required: true,
    },
}, {
    timestamps: true, // Tự động thêm createdAt và updatedAt
});

const Workplace = mongoose.model('Workplace', workplaceSchema);
module.exports = Workplace;