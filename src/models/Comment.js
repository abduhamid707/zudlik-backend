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
    required: [true, 'Comment matni kiriting'],
    trim: true,
    minlength: [5, 'Comment kamida 5 ta belgidan iborat bo\'lishi kerak'],
    maxlength: [2000, 'Comment 2000 ta belgidan oshmasligi kerak']
  },
  // Ichki commentlar uchun (reply)
  asosiyComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  // Like qilganlar
  likelar: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likeSoni: {
    type: Number,
    default: 0
  },
  // Bu javob to'g'ri deb belgilangan
  javobmi: {
    type: Boolean,
    default: false
  },
  // Ichki javoblar soni
  javoblarSoni: {
    type: Number,
    default: 0
  },
  tahrirlangan: {
    type: Boolean,
    default: false
  },
  aktiv: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
commentSchema.index({ problem: 1, createdAt: -1 });
commentSchema.index({ muallif: 1, createdAt: -1 });
commentSchema.index({ asosiyComment: 1, createdAt: 1 });
commentSchema.index({ javobmi: 1 });

// Virtual for replies
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'asosiyComment',
  justOne: false
});

// Like qo'shish/olib tashlash
commentSchema.methods.likeBerish = async function(userId) {
  const index = this.likelar.indexOf(userId);
  
  if (index > -1) {
    // Like'ni olib tashlash
    this.likelar.splice(index, 1);
    this.likeSoni = Math.max(0, this.likeSoni - 1);
  } else {
    // Like qo'shish
    this.likelar.push(userId);
    this.likeSoni += 1;
  }
  
  await this.save();
  return index === -1; // true = like qo'shildi, false = olib tashlandi
};

// Javob sifatida belgilash
commentSchema.methods.javobQilish = async function() {
  this.javobmi = true;
  await this.save();
};

// Problem'ning comment sonini yangilash
commentSchema.post('save', async function() {
  if (!this.asosiyComment) {
    // Asosiy comment bo'lsa, problem'ning comment sonini oshirish
    await this.model('Problem').findByIdAndUpdate(this.problem, {
      $inc: { commentlarSoni: 1 }
    });
  } else {
    // Reply bo'lsa, asosiy comment'ning reply sonini oshirish
    await this.model('Comment').findByIdAndUpdate(this.asosiyComment, {
      $inc: { javoblarSoni: 1 }
    });
  }
});

// Comment o'chirilganda problem'ning comment sonini kamaytirish
commentSchema.post('deleteOne', { document: true, query: false }, async function() {
  if (!this.asosiyComment) {
    await this.model('Problem').findByIdAndUpdate(this.problem, {
      $inc: { commentlarSoni: -1 }
    });
  } else {
    await this.model('Comment').findByIdAndUpdate(this.asosiyComment, {
      $inc: { javoblarSoni: -1 }
    });
  }
});

module.exports = mongoose.model('Comment', commentSchema);