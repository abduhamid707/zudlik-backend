const Notification = require('../models/Notification');

// Bildirishnoma yaratish
exports.createNotification = async ({
  qabulQiluvchi,
  yuboruvchi,
  turi,
  matn,
  havolaManzil,
  problem,
  comment
}) => {
  try {
    // O'ziga o'zi bildirishnoma yubormasin
    if (qabulQiluvchi.toString() === yuboruvchi?.toString()) {
      return null;
    }

    const notification = await Notification.create({
      qabulQiluvchi,
      yuboruvchi,
      turi,
      matn,
      havolaManzil,
      problem,
      comment
    });

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};
