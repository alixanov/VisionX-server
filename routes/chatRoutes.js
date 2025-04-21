const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, chatController.handleChat);
router.get('/:userId', authMiddleware, chatController.getMessages);

module.exports = router;