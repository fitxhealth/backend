const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/recommend-stack', aiController.recommendStack);
router.post('/chat-recommend', aiController.chatRecommend);

module.exports = router;
