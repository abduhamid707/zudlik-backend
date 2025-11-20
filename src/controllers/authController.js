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
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Email kiritilganligini tekshirish
    if (!email) {
      return res.status(400).json({
        success: false,
        xabar: 'Email kiriting'
      });
    }
    
    // Foydalanuvchini topish
    const user = await User.findOne({ email });
    
    if (!user) {
      // Security: Foydalanuvchi topilmasa ham success qaytaramiz (email enumeration attack oldini olish)
      return res.status(200).json({
        success: true,
        xabar: 'Agar bu email ro\'yxatdan o\'tgan bo\'lsa, parolni tiklash havolasini yubordik'
      });
    }
    
    // Reset token yaratish
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Token'ni hash qilib saqlash
    user.parolTiklashToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Token'ning amal qilish muddati (10 daqiqa)
    user.parolTiklashMuddati = Date.now() + 10 * 60 * 1000;
    
    await user.save({ validateBeforeSave: false });
    
    // Email yuborish
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    const message = `
      <h1>Parolni Tiklash</h1>
      <p>Siz parolni tiklashni so'radingiz. Quyidagi havolaga o'ting:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Parolni Tiklash</a>
      <p>Bu havola 10 daqiqa amal qiladi.</p>
      <p>Agar siz bu so'rovni yubormagan bo'lsangiz, bu emailni e'tiborsiz qoldiring.</p>
    `;
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'Parolni Tiklash - Zudlik',
        message
      });
      
      res.status(200).json({
        success: true,
        xabar: 'Parolni tiklash havolasini emailingizga yubordik'
      });
    } catch (error) {
      console.error('Email yuborish xatosi:', error);
      
      // Xatolik bo'lsa tokenni o'chirish
      user.parolTiklashToken = undefined;
      user.parolTiklashMuddati = undefined;
      await user.save({ validateBeforeSave: false });
      
      return res.status(500).json({
        success: false,
        xabar: 'Email yuborishda xatolik'
      });
    }
    
  } catch (error) {
    console.error('Forgot password xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};

// @desc    Parolni tiklash
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { parol, parolTasdiqlash } = req.body;
    
    // Validatsiya
    if (!parol || !parolTasdiqlash) {
      return res.status(400).json({
        success: false,
        xabar: 'Barcha maydonlarni to\'ldiring'
      });
    }
    
    if (parol !== parolTasdiqlash) {
      return res.status(400).json({
        success: false,
        xabar: 'Parollar bir xil emas'
      });
    }
    
    if (parol.length < 6) {
      return res.status(400).json({
        success: false,
        xabar: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'
      });
    }
    
    // Token'ni hash qilish
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');
    
    // Foydalanuvchini topish (token amal qilish muddati tekshiriladi)
    const user = await User.findOne({
      parolTiklashToken: resetPasswordToken,
      parolTiklashMuddati: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        xabar: 'Token noto\'g\'ri yoki muddati o\'tgan'
      });
    }
    
    // Yangi parolni saqlash
    user.parol = parol;
    user.parolTiklashToken = undefined;
    user.parolTiklashMuddati = undefined;
    await user.save();
    
    // Token yaratish
    const token = tokenYarat(user._id);
    
    res.status(200).json({
      success: true,
      xabar: 'Parol muvaffaqiyatli o\'zgartirildi',
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
    console.error('Reset password xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};

// Email yuborish funksiyasi
const sendEmail = async (options) => {
  // Nodemailer transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  
  const mailOptions = {
    from: `Zudlik <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    html: options.message
  };
  
  await transporter.sendMail(mailOptions);
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