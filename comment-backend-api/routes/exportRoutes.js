const express = require('express');
const exportController = require('../controllers/exportController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/json', authMiddleware.protect, exportController.json);
router.post('/csv', authMiddleware.protect, exportController.csv);
router.post('/xml', authMiddleware.protect, exportController.xml);
router.post('/txt', authMiddleware.protect, exportController.txt);

router.post('/public/json', authMiddleware.protectAPI, exportController.json);
router.post('/public/csv', authMiddleware.protectAPI, exportController.csv);
router.post('/public/xml', authMiddleware.protectAPI, exportController.xml);
router.post('/public/txt', authMiddleware.protectAPI, exportController.txt);

module.exports = router;
