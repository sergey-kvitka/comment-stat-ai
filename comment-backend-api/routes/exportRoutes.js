const express = require('express');
const exportController = require('../controllers/exportController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/json', authMiddleware.protect, exportController.json);
router.post('/csv', authMiddleware.protect, exportController.csv);
router.post('/xml', authMiddleware.protect, exportController.xml);

module.exports = router;
