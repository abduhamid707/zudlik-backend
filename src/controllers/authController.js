const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { registerValidatsiya, loginValidatsiya } = require('../utils/validation');

// JWT token yaratish
const tokenYarat = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Ro'yxatdan o'tish
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { ism, familiya, email, telefon, parol, parolTasdiqlash } = req.body;
    
    // Ma'lumotlarni validatsiya qilish
    const validatsiya = registerValidatsiya(req.body);
    
    if (!validatsiya.valid) { 
      return res.status(400).json({
        success: false,
        xabar: 'Validatsiya xatosi',
        xatolar: validatsiya.xatolar
      });
    }
    
    // Email mavjudligini tekshirish
    const emailMavjud = await User.findOne({ email });
    if (emailMavjud) {
      return res.status(400).json({
        success: false,
        xabar: 'Bu email allaqachon ro\'yxatdan o\'tgan'
      });
    }
    
    // Telefon mavjudligini tekshirish
    const telefonMavjud = await User.findOne({ telefon });
    if (telefonMavjud) {
      return res.status(400).json({
        success: false,
        xabar: 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan'
      });
    }
    
    // Yangi foydalanuvchi yaratish
    const user = await User.create({
      ism,
      familiya,
      email,
      telefon,
      parol
    });
    
    // Token yaratish
    const token = tokenYarat(user._id);
    
    // Javob qaytarish
    res.status(201).json({
      success: true,
      xabar: 'Ro\'yxatdan o\'tish muvaffaqiyatli!',
      token,
      user: {
        id: user._id,
        ism: user.ism,
        familiya: user.familiya,
        email: user.email,
        telefon: user.telefon,
        rol: user.rol,
        avatar: user.avatar
      }
    });
    
  } catch (error) {
    console.error('Register xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};

// @desc    Tizimga kirish
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { emailYokiTelefon, parol } = req.body;
    
    // Ma'lumotlarni validatsiya qilish
    const validatsiya = loginValidatsiya(req.body);
    
    if (!validatsiya.valid) {
      return res.status(400).json({
        success: false,
        xabar: 'Validatsiya xatosi',
        xatolar: validatsiya.xatolar
      });
    }
    
    // Foydalanuvchini email yoki telefon orqali topish
    const user = await User.findOne({
      $or: [
        { email: emailYokiTelefon },
        { telefon: emailYokiTelefon }
      ]
    }).select('+parol'); // Parolni ham qaytarish
    
    // Foydalanuvchi topilmasa
    if (!user) {
      return res.status(401).json({
        success: false,
        xabar: 'Email/telefon yoki parol noto\'g\'ri'
      });
    }
    
    // Parolni tekshirish
    const parolTogri = await user.parolTekshir(parol);
    
    if (!parolTogri) {
      return res.status(401).json({
        success: false,
        xabar: 'Email/telefon yoki parol noto\'g\'ri'
      });
    }
    
    // Agar foydalanuvchi aktiv emas bo'lsa
    if (!user.aktiv) {
      return res.status(403).json({
        success: false,
        xabar: 'Sizning hisobingiz bloklangan'
      });
    }
    
    // Token yaratish
    const token = tokenYarat(user._id);
    
    // Javob qaytarish
    res.status(200).json({
      success: true,
      xabar: 'Tizimga muvaffaqiyatli kirdingiz!',
      token,
      user: {
        id: user._id,
        ism: user.ism,
        familiya: user.familiya,
        email: user.email,
        telefon: user.telefon,
        rol: user.rol,
        avatar: user.avatar
      }
    });
    
  } catch (error) {
    console.error('Login xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};

// @desc    Foydalanuvchi ma'lumotlarini olish
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        ism: user.ism,
        familiya: user.familiya,
        email: user.email,
        telefon: user.telefon,
        rol: user.rol,
        avatar: user.avatar,
        tasdiqlanganEmail: user.tasdiqlanganEmail,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('GetMe xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};