const express = require('express');
const importController = require('../controllers/importController');
const authMiddleware = require('../middlewares/authMiddleware');

const upload = require('multer')({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }
});

const router = express.Router();

router.post('/json', authMiddleware.protect, upload.single('dataFile'), importController.json);
router.post('/txt', authMiddleware.protect, upload.single('dataFile'), importController.txt);

router.post('/public/json', authMiddleware.protectAPI, upload.single('dataFile'), importController.json);
router.post('/public/txt', authMiddleware.protectAPI, upload.single('dataFile'), importController.txt);

module.exports = router;
