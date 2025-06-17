const express = require('express');
const statController = require('../controllers/statController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/all', authMiddleware.protect, statController.all);
router.post('/findByPeriod', authMiddleware.protect, statController.findByPeriod);
router.post('/compare', authMiddleware.protect, statController.comparison);

module.exports = router;