const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  ism: {
    type: String,
    required: [true, 'Ism kiriting'],
    trim: true,
    minlength: [2, 'Ism kamida 2 ta belgidan iborat bo\'lishi kerak'],
    maxlength: [50, 'Ism 50 ta belgidan oshmasligi kerak']
  },
  familiya: {
    type: String,
    required: [true, 'Familiya kiriting'],
    trim: true,
    minlength: [2, 'Familiya kamida 2 ta belgidan iborat bo\'lishi kerak'],
    maxlength: [50, 'Familiya 50 ta belgidan oshmasligi kerak']
  },
  email: {
    type: String,
    required: [true, 'Email kiriting'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'To\'g\'ri email kiriting'
    ]
  },
  telefon: {
    type: String,
    required: [true, 'Telefon raqam kiriting'],
    unique: true,
    trim: true,
    match: [
      /^(\+998|998)?[0-9]{9}$/,
      'To\'g\'ri telefon raqam kiriting (masalan: +998901234567)'
    ]
  },
  parol: {
    type: String,
    required: [true, 'Parol kiriting'],
    minlength: [6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'],
    select: false
  },
  rol: {
    type: String,
    enum: ['foydalanuvchi', 'admin'],
    default: 'foydalanuvchi'
  },
  tasdiqlanganEmail: {
    type: Boolean,
    default: false
  },
  aktiv: {
    type: Boolean,
    default: true
  },
  avatar: {
    type: String,
    default: null
  },
  
  // ⭐ ADD THESE NEW FIELDS:
  parolTiklashToken: {
    type: String,
    select: false
  },
  parolTiklashMuddati: {
    type: Date,
    select: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});
// Parolni hash qilish (saqlashdan oldin)
userSchema.pre('save', async function(next) {
  // Agar parol o'zgarmagan bo'lsa, o'tkazib yuboramiz
  if (!this.isModified('parol')) {
    next();
  }
  
  // Parolni hash qilish
  const salt = await bcrypt.genSalt(10);
  this.parol = await bcrypt.hash(this.parol, salt);
});

// Parolni tekshirish metodi
userSchema.methods.parolTekshir = async function(kiritilganParol) {
  return await bcrypt.compare(kiritilganParol, this.parol);
};

// To'liq ismni qaytarish
userSchema.virtual('toliqIsm').get(function() {
  return `${this.ism} ${this.familiya}`;
});

module.exports = mongoose.model('User', userSchema);