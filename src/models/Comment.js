const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: [true, 'Problem ID si kerak']
  },

  muallif: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Muallif ID si kerak']
  },

  matn: {
    type: String,
    required: [true, 'Comment matnini kiriting'],
    trim: true,
    minlength: [5, 'Comment kamida 5 ta belgidan iborat bo\'lishi kerak'],
    maxlength: [2000, 'Comment 2000 ta belgidan oshmasligi kerak']
  },

  anonim: {
    type: Boolean,
    default: false
  },

  // Reply uchun
  asosiyComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },

  likelar: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  likeSoni: { type: Number, default: 0 },
  javobmi: { type: Boolean, default: false },
  javoblarSoni: { type: Number, default: 0 },
  tahrirlangan: { type: Boolean, default: false },
  aktiv: { type: Boolean, default: true }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


// ==============================
//        INDEXES
// ==============================
commentSchema.index({ problem: 1, createdAt: -1 });
commentSchema.index({ muallif: 1, createdAt: -1 });
commentSchema.index({ asosiyComment: 1 });
commentSchema.index({ javobmi: 1 });

// ==============================
//       VIRTUAL REPLIES
// ==============================
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'asosiyComment',
  justOne: false,
  options: { sort: { createdAt: 1 } }
});

// ==============================
//       LIKE BERISH
// ==============================
commentSchema.methods.likeBerish = async function(userId) {
  const index = this.likelar.findIndex(id => id.toString() === userId.toString());
  if (index >= 0) {
    this.likelar.splice(index, 1);
    this.likeSoni = Math.max(0, this.likeSoni - 1);
  } else {
    this.likelar.push(userId);
    this.likeSoni += 1;
  }
  await this.save();
  return index < 0;
};

// ==============================
//    SAVE HOOK (counter)
// ==============================
commentSchema.post('save', async function() {
  if (!this.asosiyComment) {
    await this.model('Problem').findByIdAndUpdate(this.problem, { $inc: { commentlarSoni: 1 } });
  } else {
    await this.model('Comment').findByIdAndUpdate(this.asosiyComment, { $inc: { javoblarSoni: 1 } });
  }
});

// ==============================
//    DELETE HOOK
// ==============================
commentSchema.post('deleteOne', { document: true }, async function() {
  if (!this.asosiyComment) {
    await this.model('Problem').findByIdAndUpdate(this.problem, { $inc: { commentlarSoni: -1 } });
  } else {
    await this.model('Comment').findByIdAndUpdate(this.asosiyComment, { $inc: { javoblarSoni: -1 } });
  }
});

module.exports = mongoose.model('Comment', commentSchema);
