const express = require('express');
const router = express.Router();
const bonusController = require('../controllers/performanceBonus.controller.js');
const { verifyToken, checkAdmin } = require('../middleware/auth.js');

// Áp dụng middleware cho tất cả các route trong file này
router.use(verifyToken, checkAdmin);

// Định nghĩa các route CRUD
router.get('/', bonusController.getAllBonuses);
router.post('/', bonusController.createBonus);
router.put('/:grade', bonusController.updateBonus);
router.delete('/:grade', bonusController.deleteBonus);

module.exports = router;