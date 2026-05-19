const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/recommend-stack', aiController.recommendStack);

module.exports = router;
