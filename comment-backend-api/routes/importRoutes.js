const express = require('express');
const importController = require('../controllers/importController');
const authMiddleware = require('../middlewares/authMiddleware');

const upload = require('multer')({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }
});

const router = express.Router();

router.post('/json', authMiddleware.protect, upload.single('jsonFile'), importController.json);
router.post('/jsono', upload.single('jsonFile'), importController.json);

module.exports = router;
