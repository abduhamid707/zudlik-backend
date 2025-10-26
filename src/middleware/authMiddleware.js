const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Foydalanuvchini autentifikatsiya qilish
exports.himoyalash = async (req, res, next) => {
  let token;
  
  // Token header'dan olish
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Token yo'qligini tekshirish
  if (!token) {
    return res.status(401).json({
      success: false,
      xabar: 'Tizimga kirish uchun autentifikatsiya talab qilinadi'
    });
  }
  
  try {
    // Tokenni tekshirish
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Foydalanuvchini topish
    req.user = await User.findById(decoded.id);
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        xabar: 'Foydalanuvchi topilmadi'
      });
    }
    
    // Foydalanuvchi aktiv emasligini tekshirish
    if (!req.user.aktiv) {
      return res.status(403).json({
        success: false,
        xabar: 'Sizning hisobingiz bloklangan'
      });
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware xatosi:', error);
    return res.status(401).json({
      success: false,
      xabar: 'Token noto\'g\'ri yoki muddati o\'tgan'
    });
  }
};

// Rolni tekshirish middleware
exports.ruxsatBerish = (...rollar) => {
  return (req, res, next) => {
    if (!rollar.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        xabar: `${req.user.rol} roli uchun bu amal ruxsat etilmagan`
      });
    }
    next();
  };
};


// Optional himoya - token bo'lsa check qiladi, bo'lmasa o'tkazib yuboradi
exports.optionalHimoyalash = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Token bo'lmasa ham davom etadi
    if (!token) {
      return next();
    }
    
    // Token bo'lsa verify qiladi
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-parol');
      next();
    } catch (error) {
      // Token noto'g'ri bo'lsa ham davom etadi
      console.log('Token verification failed, continuing without auth');
      next();
    }
    
  } catch (error) {
    next();
  }
};