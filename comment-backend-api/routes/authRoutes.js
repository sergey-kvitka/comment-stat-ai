const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', authMiddleware.forbidAPI, authController.register);
router.post('/login', authMiddleware.forbidAPI, authController.login);
router.get('/check', authMiddleware.protect, authController.check);
router.get('/profile', authMiddleware.protect, authController.getProfile);

module.exports = router;