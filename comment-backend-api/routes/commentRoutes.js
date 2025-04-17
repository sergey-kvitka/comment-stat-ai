const express = require('express');
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/all', authMiddleware.protect, commentController.all);

module.exports = router;