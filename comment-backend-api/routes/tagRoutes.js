const express = require('express');
const tagController = require('../controllers/tagController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/all', authMiddleware.protect, tagController.all);
router.post('/save', authMiddleware.protect, tagController.save);

module.exports = router;
