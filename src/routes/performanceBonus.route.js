const express = require('express');
const router = express.Router();
const bonusController = require('../controllers/performanceBonus.controller.js');
const { verifyToken, checkAdmin } = require('../middleware/auth.js');

router.use(verifyToken, checkAdmin);

// Định nghĩa các route CRUD
router.post('/search', bonusController.searchBonuses);
router.post('/', bonusController.createBonus);
// << SỬA LẠI ĐÂY >>
router.patch('/:id', bonusController.updateBonus); // Dùng /:id và PATCH
router.delete('/:id', bonusController.softDeleteBonus); // Dùng /:id

module.exports = router;