const mongoose = require('mongoose');

const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Bu options MongoDB 6+ da talab qilinmaydi, lekin eski versiyalar uchun
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Atlas ulandi: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    
    // Connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
  } catch (error) {
    console.error(`❌ MongoDB ulanishda xatolik: ${error.message}`);
    console.error('Full error:', error);
    process.exit(1);
  }
};

module.exports = connectDatabase;