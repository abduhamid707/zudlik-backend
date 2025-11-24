const Notification = require('../models/Notification');

// @desc    Bildirishnomalarni olish
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({
      qabulQiluvchi: req.user.id
    })
      .populate('yuboruvchi', 'ism familiya avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments({
      qabulQiluvchi: req.user.id
    });

    const oqilmaganSoni = await Notification.countDocuments({
      qabulQiluvchi: req.user.id,
      oqilgan: false
    });

    res.status(200).json({
      success: true,
      notifications,
      total,
      oqilmaganSoni,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};

// @desc    O'qilgan deb belgilash
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, qabulQiluvchi: req.user.id },
      { oqilgan: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        xabar: 'Bildirishnoma topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};

// @desc    Hammasini o'qilgan deb belgilash
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { qabulQiluvchi: req.user.id, oqilgan: false },
      { oqilgan: true }
    );

    res.status(200).json({
      success: true,
      xabar: 'Barcha bildirishnomalar o\'qilgan'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};

// @desc    Bildirishnomani o'chirish
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      qabulQiluvchi: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        xabar: 'Bildirishnoma topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      xabar: 'Bildirishnoma o\'chirildi'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};

// @desc    O'qilmagan bildirishnomalar soni
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      qabulQiluvchi: req.user.id,
      oqilgan: false
    });

    res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};
