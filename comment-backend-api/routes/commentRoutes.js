const express = require('express');
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/all', authMiddleware.protect, commentController.all);
router.post('/save', authMiddleware.protect, commentController.save);
router.post('/getByFilters', authMiddleware.protect, commentController.getByFilters);
router.post('/updateAll', authMiddleware.protect, commentController.updateAll);
router.put('/delete', authMiddleware.protect, commentController.delete);

module.exports = router;
