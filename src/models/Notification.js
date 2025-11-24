const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  qabulQiluvchi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  yuboruvchi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  turi: {
    type: String,
    enum: ['comment', 'reply', 'like', 'solution', 'system'],
    required: true
  },
  matn: {
    type: String,
    required: true
  },
  havolaManzil: {
    type: String,
    required: false
  },
  oqilgan: {
    type: Boolean,
    default: false
  },
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: false
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    required: false
  }
}, {
  timestamps: true
});

notificationSchema.index({ qabulQiluvchi: 1, createdAt: -1 });
notificationSchema.index({ qabulQiluvchi: 1, oqilgan: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
