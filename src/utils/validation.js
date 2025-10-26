// Email validatsiyasi
const emailTekshir = (email) => {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

// Telefon validatsiyasi
const telefonTekshir = (telefon) => {
  const telefonRegex = /^(\+998|998)?[0-9]{9}$/;
  return telefonRegex.test(telefon);
};

// Parol kuchliligini tekshirish
const parolKuchli = (parol) => {
  if (parol.length < 6) {
    return {
      valid: false,
      xabar: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'
    };
  }
  
  // Kamida bitta raqam bo'lishi kerak
  if (!/\d/.test(parol)) {
    return {
      valid: false,
      xabar: 'Parol kamida bitta raqam o\'z ichiga olishi kerak'
    };
  }
  
  return { valid: true };
};

// Register ma'lumotlarini tekshirish
const registerValidatsiya = (data) => {
  const xatolar = [];
  
  // Ism tekshirish
  if (!data.ism || data.ism.trim().length < 2) {
    xatolar.push('Ism kamida 2 ta belgidan iborat bo\'lishi kerak');
  }
  
  // Familiya tekshirish
  if (!data.familiya || data.familiya.trim().length < 2) {
    xatolar.push('Familiya kamida 2 ta belgidan iborat bo\'lishi kerak');
  }
  
  // Email tekshirish
  if (!data.email || !emailTekshir(data.email)) {
    xatolar.push('To\'g\'ri email kiriting');
  }
  
  // Telefon tekshirish
  if (!data.telefon || !telefonTekshir(data.telefon)) {
    xatolar.push('To\'g\'ri telefon raqam kiriting');
  }
  
  // Parol tekshirish
  if (!data.parol) {
    xatolar.push('Parol kiriting');
  } else {
    const parolTekshiruv = parolKuchli(data.parol);
    if (!parolTekshiruv.valid) {
      xatolar.push(parolTekshiruv.xabar);
    }
  }
  
  // Parol tasdiqlash
  if (data.parol !== data.parolTasdiqlash) {
    xatolar.push('Parollar mos kelmayapti');
  }
  
  return {
    valid: xatolar.length === 0,
    xatolar
  };
};

// Login ma'lumotlarini tekshirish
const loginValidatsiya = (data) => {
  const xatolar = [];
  
  // Email yoki telefon tekshirish
  if (!data.emailYokiTelefon) {
    xatolar.push('Email yoki telefon raqam kiriting');
  }
  
  // Parol tekshirish
  if (!data.parol) {
    xatolar.push('Parol kiriting');
  }
  
  return {
    valid: xatolar.length === 0,
    xatolar
  };
};

module.exports = {
  emailTekshir,
  telefonTekshir,
  parolKuchli,
  registerValidatsiya,
  loginValidatsiya
};