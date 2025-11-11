const mongoose = require('mongoose');
const Review = require('../models/Review');
const User = require('../models/User');
const Property = require('../models/Property');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gunluk-kiralik-evim';

const sampleComments = [
  'Harika bir konum, denize çok yakın. Daire temiz ve ferah. Kesinlikle tekrar geliriz!',
  'Çok güzel bir daireydi. Sahibi çok ilgiliydi. Her şey tam olarak tarif edildiği gibiydi.',
  'Tatilimiz çok güzeldi. Daire çok temiz ve konforluydu. Öneririm!',
  'Mükemmel bir deneyim. Hem konum hem de daire çok iyiydi. Teşekkürler!',
  'Çok memnun kaldık. Daire çok şık ve modern. Kesinlikle tavsiye ederim.',
  'Harika bir tatil geçirdik. Daire çok temiz ve düzenliydi. Tekrar gelmek isteriz.',
  'Çok güzel bir yer. Denize yakın, temiz ve konforlu. Her şey mükemmeldi!',
  'Daire çok beğendik. Sahibi çok yardımcıydı. Kesinlikle tekrar geliriz.',
  'Mükemmel bir konum. Daire çok temiz ve ferah. Çok memnun kaldık!',
  'Harika bir deneyim. Her şey çok iyiydi. Kesinlikle öneririm!',
  'Çok güzel bir daire. Temiz, konforlu ve denize yakın. Teşekkürler!',
  'Tatilimiz çok güzeldi. Daire çok beğendik. Tekrar gelmek isteriz.',
  'Mükemmel bir yer. Hem konum hem de daire çok iyiydi. Öneririm!',
  'Çok memnun kaldık. Daire çok şık ve modern. Her şey mükemmeldi!',
  'Harika bir tatil geçirdik. Daire çok temiz ve düzenliydi. Teşekkürler!'
];

const turkishNames = [
  'Ahmet Yılmaz', 'Ayşe Demir', 'Mehmet Kaya', 'Fatma Şahin', 'Ali Çelik',
  'Zeynep Arslan', 'Mustafa Özdemir', 'Elif Yıldız', 'Burak Doğan', 'Selin Avcı',
  'Can Öztürk', 'Derya Kılıç', 'Emre Yücel', 'Gizem Aydın', 'Hakan Taş'
];

function getRandomRating() {
  const rand = Math.random();
  if (rand < 0.7) return Math.floor(Math.random() * 2) + 4; // 4 veya 5
  else if (rand < 0.9) return 3;
  else return Math.floor(Math.random() * 2) + 1;
}

function getRandomSubRating() {
  return Math.floor(Math.random() * 3) + 3; // 3-5
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function quickSeed() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ MongoDB bağlantısı başarılı');

    // 1. Tüm yorumları sil
    const deletedCount = await Review.deleteMany({});
    console.log(`🗑️  ${deletedCount.deletedCount} yorum silindi`);

    // 2. Kullanıcı ve daireleri al
    let users = await User.find({ role: 'user' }).limit(20);
    let properties = await Property.find({ isActive: true }).limit(20);

    // Eğer kullanıcı yoksa, admin kullanıcısını kullan
    if (users.length === 0) {
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        users = [adminUser];
        console.log('📝 Admin kullanıcısı kullanılıyor');
      }
    }

    if (properties.length === 0) {
      console.log('❌ Daire bulunamadı!');
      process.exit(1);
    }

    if (users.length === 0) {
      console.log('❌ Kullanıcı bulunamadı!');
      process.exit(1);
    }

    console.log(`📋 ${users.length} kullanıcı ve ${properties.length} daire bulundu`);

    // 3. 15 yorum oluştur
    const reviewsToCreate = [];

    for (let i = 0; i < 15; i++) {
      let user = getRandomElement(users);
      
      // %50 ihtimalle yeni kullanıcı oluştur
      if (Math.random() < 0.5) {
        const randomName = getRandomElement(turkishNames);
        const tempEmail = `guest_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}@temp.com`;
        
        let existingUser = await User.findOne({ name: randomName, email: { $regex: /^guest_.*@temp\.com$/ } });
        if (!existingUser) {
          existingUser = new User({
            name: randomName,
            email: tempEmail,
            password: 'temp123',
            role: 'user'
          });
          await existingUser.save();
          user = existingUser;
        } else {
          user = existingUser;
        }
      }

      const property = getRandomElement(properties);
      const rating = getRandomRating();

      const review = {
        property: property._id,
        booking: new mongoose.Types.ObjectId(),
        user: user._id,
        rating: {
          overall: rating,
          cleanliness: getRandomSubRating(),
          location: getRandomSubRating(),
          value: getRandomSubRating(),
          communication: getRandomSubRating()
        },
        comment: getRandomElement(sampleComments),
        isVerified: Math.random() > 0.3,
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
      };

      reviewsToCreate.push(review);
    }

    await Review.insertMany(reviewsToCreate);
    const finalCount = await Review.countDocuments({});

    console.log(`✅ ${reviewsToCreate.length} yorum oluşturuldu!`);
    console.log(`📊 Toplam yorum sayısı: ${finalCount}`);
    console.log('🎉 Tamamlandı! Ana sayfa ve admin panelde görünecek.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

quickSeed();

