const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  muallif: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Muallif ID si kerak']
  },
  sarlavha: {
    type: String,
    required: [true, 'Sarlavha kiriting'],
    trim: true,
    minlength: [10, 'Sarlavha kamida 10 ta belgidan iborat bo\'lishi kerak'],
    maxlength: [200, 'Sarlavha 200 ta belgidan oshmasligi kerak']
  },
  tavsif: {
    type: String,
    required: [true, 'Muammo tavsifini kiriting'],
    trim: true,
    minlength: [20, 'Tavsif kamida 20 ta belgidan iborat bo\'lishi kerak'],
    maxlength: [5000, 'Tavsif 5000 ta belgidan oshmasligi kerak']
  },
  kategoriya: {
    type: String,
    enum: [
      'salomatlik',
      'moliya',
      'ta\'lim',
      'texnologiya',
      'uy-joy',
      'transport',
      'ish',
      'shaxsiy',
      'boshqa'
    ],
    default: 'boshqa'
  },
  // 🆕 TAGS
  tags: [{
    type: String,
    lowercase: true,
    trim: true,
    maxlength: [30, 'Tag 30 ta belgidan oshmasligi kerak']
  }],
  // 🆕 ANONIMLIK
  anonim: {
    type: Boolean,
    default: false
  },
  holat: {
    type: String,
    enum: ['ochiq', 'yechilgan', 'yopilgan'],
    default: 'ochiq'
  },
  yechilganComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  korishlar: {
    type: Number,
    default: 0
  },
  commentlarSoni: {
    type: Number,
    default: 0
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

// Indexes for better performance
problemSchema.index({ muallif: 1, createdAt: -1 });
problemSchema.index({ kategoriya: 1, createdAt: -1 });
problemSchema.index({ holat: 1, createdAt: -1 });
problemSchema.index({ tags: 1 }); // 🆕 Tags index
problemSchema.index({ sarlavha: 'text', tavsif: 'text' });

// 🆕 Tags validatsiyasi
problemSchema.pre('save', function(next) {
  // Maksimum 5 ta tag
  if (this.tags && this.tags.length > 5) {
    this.tags = this.tags.slice(0, 5);
  }
  
  // Bo'sh tag'larni olib tashlash
  if (this.tags) {
    this.tags = this.tags.filter(tag => tag && tag.trim().length > 0);
  }
  
  next();
});

// Virtual for comments
problemSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'problem',
  justOne: false
});

// Ko'rishlarni oshirish
problemSchema.methods.korishniOshir = async function() {
  this.korishlar += 1;
  await this.save();
};

// Problem yechildi deb belgilash
problemSchema.methods.yechildiDeb = async function(commentId) {
  this.holat = 'yechilgan';
  this.yechilganComment = commentId;
  await this.save();
};

module.exports = mongoose.model('Problem', problemSchema);