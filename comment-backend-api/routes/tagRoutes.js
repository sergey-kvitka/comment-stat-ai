const express = require('express');
const tagController = require('../controllers/tagController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/all', authMiddleware.protect, tagController.all);
router.post('/save', authMiddleware.protect, tagController.save);
router.put('/update', authMiddleware.protect, tagController.update);
router.put('/delete', authMiddleware.protect, tagController.delete);

module.exports = router;
