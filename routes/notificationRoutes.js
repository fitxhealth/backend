const express = require('express');
const router = express.Router();
const {
  createNotification,
  getNotifications,
  updateNotificationStatus,
  deleteNotification
} = require('../controllers/notificationController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .post(createNotification)
  .get(protect, admin, getNotifications);

router.route('/:id')
  .put(protect, admin, updateNotificationStatus)
  .delete(protect, admin, deleteNotification);

module.exports = router;
