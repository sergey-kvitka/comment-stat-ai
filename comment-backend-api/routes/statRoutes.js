const express = require('express');
const statController = require('../controllers/statController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/all', authMiddleware.protect, statController.all);

module.exports = router;