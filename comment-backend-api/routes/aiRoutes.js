const express = require('express');
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/analyze', authMiddleware.protect, aiController.analyze);

module.exports = router;