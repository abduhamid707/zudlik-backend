const User = require('../models/User');
const Problem = require('../models/Problem');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { registerValidatsiya, loginValidatsiya } = require('../utils/validation');

// JWT token yaratish
const tokenYarat = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Email yuborish funksiyasi
const sendEmail = async (options) => {
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
    }).select('+parol');
    
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

// @desc    Parolni unutish
// @route   POST /api/auth/forgot-password
// @access  Public
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
    
    // Foydalanuvchini topish
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

// @desc    Foydalanuvchi ma'lumotlarini olish (profil sahifasi uchun)
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        xabar: 'Foydalanuvchi topilmadi'
      });
    }
    
    // Foydalanuvchining problemlari statistikasi
    const muammolarSoni = await Problem.countDocuments({ 
      muallif: user._id,
      aktiv: true 
    });
    
    const yechilganlar = await Problem.countDocuments({ 
      muallif: user._id,
      holat: 'yechilgan',
      aktiv: true 
    });
    
    const javoblar = await Problem.countDocuments({ 
      muallif: user._id,
      commentlarSoni: { $gt: 0 },
      aktiv: true 
    });
    
    const korishlar = await Problem.aggregate([
      { 
        $match: { 
          muallif: user._id,
          aktiv: true 
        } 
      },
      { 
        $group: { 
          _id: null, 
          jami: { $sum: '$korishlar' } 
        } 
      }
    ]);
    
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        ism: user.ism,
        familiya: user.familiya,
        toliqIsm: user.toliqIsm,
        email: user.email,
        telefon: user.telefon,
        rol: user.rol,
        avatar: user.avatar,
        tasdiqlanganEmail: user.tasdiqlanganEmail,
        aktiv: user.aktiv,
        createdAt: user.createdAt,
        // Statistika
        statistika: {
          muammolarSoni,
          yechilganlar,
          javoblar,
          korishlar: korishlar.length > 0 ? korishlar[0].jami : 0
        }
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




exports.updateProfile = async (req, res) => {
  try {
    const { ism, familiya, email, telefon, avatar } = req.body;
    
    // Validatsiya
    if (!ism || !familiya || !email || !telefon) {
      return res.status(400).json({
        success: false,
        xabar: 'Barcha maydonlarni to\'ldiring'
      });
    }

    // Email format tekshirish
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        xabar: 'To\'g\'ri email kiriting'
      });
    }

    // Telefon format tekshirish
    const telefonRegex = /^(\+998|998)?[0-9]{9}$/;
    if (!telefonRegex.test(telefon)) {
      return res.status(400).json({
        success: false,
        xabar: 'To\'g\'ri telefon raqam kiriting'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        xabar: 'Foydalanuvchi topilmadi'
      });
    }

    // Email o'zgargan bo'lsa, mavjudligini tekshirish
    if (email !== user.email) {
      const emailMavjud = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailMavjud) {
        return res.status(400).json({
          success: false,
          xabar: 'Bu email allaqachon ro\'yxatdan o\'tgan'
        });
      }
    }

    // Telefon o'zgargan bo'lsa, mavjudligini tekshirish
    if (telefon !== user.telefon) {
      const telefonMavjud = await User.findOne({ telefon, _id: { $ne: user._id } });
      if (telefonMavjud) {
        return res.status(400).json({
          success: false,
          xabar: 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan'
        });
      }
    }

    // Ma'lumotlarni yangilash
    user.ism = ism;
    user.familiya = familiya;
    user.email = email;
    user.telefon = telefon;
    
    // Avatar o'zgargan bo'lsa yangilash
    if (avatar && avatar !== user.avatar) {
      user.avatar = avatar;
    }

    await user.save();

    res.status(200).json({
      success: true,
      xabar: 'Profil muvaffaqiyatli yangilandi',
      user: {
        id: user._id,
        ism: user.ism,
        familiya: user.familiya,
        toliqIsm: user.toliqIsm,
        email: user.email,
        telefon: user.telefon,
        rol: user.rol,
        avatar: user.avatar,
        tasdiqlanganEmail: user.tasdiqlanganEmail,
        aktiv: user.aktiv,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Update profile xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};
// @desc    Parolni o'zgartirish
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { joriyParol, yangiParol, yangiParolTasdiqlash } = req.body;

    // Validatsiya
    if (!joriyParol || !yangiParol || !yangiParolTasdiqlash) {
      return res.status(400).json({
        success: false,
        xabar: 'Barcha maydonlarni to\'ldiring'
      });
    }

    if (yangiParol !== yangiParolTasdiqlash) {
      return res.status(400).json({
        success: false,
        xabar: 'Yangi parollar bir xil emas'
      });
    }

    if (yangiParol.length < 6) {
      return res.status(400).json({
        success: false,
        xabar: 'Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak'
      });
    }

    // Foydalanuvchini topish (parol bilan)
    const user = await User.findById(req.user.id).select('+parol');

    if (!user) {
      return res.status(404).json({
        success: false,
        xabar: 'Foydalanuvchi topilmadi'
      });
    }

    // Joriy parolni tekshirish
    const parolTogri = await user.parolTekshir(joriyParol);

    if (!parolTogri) {
      return res.status(401).json({
        success: false,
        xabar: 'Joriy parol noto\'g\'ri'
      });
    }

    // Yangi parolni saqlash
    user.parol = yangiParol;
    await user.save();

    // Token yaratish
    const token = tokenYarat(user._id);

    res.status(200).json({
      success: true,
      xabar: 'Parol muvaffaqiyatli o\'zgartirildi',
      token
    });

  } catch (error) {
    console.error('Change password xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};