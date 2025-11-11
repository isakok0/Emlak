const mongoose = require('mongoose');
const Review = require('../models/Review');
const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gunluk-kiralik-evim';

// Türkçe yorum örnekleri
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
  'Harika bir tatil geçirdik. Daire çok temiz ve düzenliydi. Teşekkürler!',
  'Çok güzel bir konum. Denize yakın, temiz ve konforlu. Kesinlikle tekrar geliriz!',
  'Daire çok beğendik. Sahibi çok ilgiliydi. Her şey tam olarak tarif edildiği gibiydi.',
  'Mükemmel bir deneyim. Hem konum hem de daire çok iyiydi. Öneririm!',
  'Çok memnun kaldık. Daire çok şık ve modern. Kesinlikle tavsiye ederim.',
  'Harika bir tatil geçirdik. Daire çok temiz ve ferah. Tekrar gelmek isteriz.'
];

const sampleNames = [
  'Ahmet Yılmaz', 'Ayşe Demir', 'Mehmet Kaya', 'Fatma Şahin', 'Ali Çelik',
  'Zeynep Arslan', 'Mustafa Özdemir', 'Elif Yıldız', 'Burak Doğan', 'Selin Avcı',
  'Can Öztürk', 'Derya Kılıç', 'Emre Yücel', 'Gizem Aydın', 'Hakan Taş',
  'İrem Çakır', 'Kemal Bulut', 'Leyla Güneş', 'Murat Aktaş', 'Nazlı Deniz'
];

function getRandomRating() {
  // Çoğunlukla 4-5 arası, bazen 3 ver
  const rand = Math.random();
  if (rand < 0.7) {
    return Math.floor(Math.random() * 2) + 4; // 4 veya 5
  } else if (rand < 0.9) {
    return 3;
  } else {
    return Math.floor(Math.random() * 2) + 1; // 1 veya 2 (nadir)
  }
}

function getRandomSubRating() {
  return Math.floor(Math.random() * 3) + 3; // 3-5 arası
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function seedReviews() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('MongoDB bağlantısı başarılı');

    // 1. Tüm yorumları sil
    const deletedCount = await Review.deleteMany({});
    console.log(`✅ ${deletedCount.deletedCount} yorum silindi`);

    // 2. Tamamlanmış rezervasyonları al
    const completedBookings = await Booking.find({ status: 'completed' })
      .populate('property')
      .populate('guest')
      .limit(50); // Maksimum 50 rezervasyon için yorum oluştur

    console.log(`📋 ${completedBookings.length} tamamlanmış rezervasyon bulundu`);

    if (completedBookings.length === 0) {
      console.log('⚠️ Tamamlanmış rezervasyon bulunamadı. Önce rezervasyonlar oluşturulmalı.');
      
      // Alternatif: Mevcut kullanıcılar ve dairelerle yorum oluştur
      const users = await User.find({ role: 'user' }).limit(20);
      const properties = await Property.find({ isActive: true }).limit(20);

      if (users.length === 0 || properties.length === 0) {
        console.log('❌ Kullanıcı veya daire bulunamadı. Önce seed işlemi yapılmalı.');
        process.exit(1);
      }

      console.log(`📝 ${users.length} kullanıcı ve ${properties.length} daire bulundu. Yorumlar oluşturuluyor...`);

      const reviewsToCreate = [];
      const reviewCount = Math.min(30, users.length * 2); // En fazla 30 yorum

      for (let i = 0; i < reviewCount; i++) {
        const user = getRandomElement(users);
        const property = getRandomElement(properties);
        const rating = getRandomRating();

        // Sahte booking ID oluştur (sadece review için)
        const fakeBookingId = new mongoose.Types.ObjectId();

        const review = {
          property: property._id,
          booking: fakeBookingId,
          user: user._id,
          rating: {
            overall: rating,
            cleanliness: getRandomSubRating(),
            location: getRandomSubRating(),
            value: getRandomSubRating(),
            communication: getRandomSubRating()
          },
          comment: getRandomElement(sampleComments),
          isVerified: true,
          createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) // Son 90 gün içinde
        };

        reviewsToCreate.push(review);
      }

      await Review.insertMany(reviewsToCreate);
      console.log(`✅ ${reviewsToCreate.length} yorum oluşturuldu!`);
    } else {
      // 3. Her rezervasyon için yorum oluştur (rastgele)
      const reviewsToCreate = [];

      for (const booking of completedBookings) {
        // %70 ihtimalle yorum oluştur
        if (Math.random() < 0.7) {
          // Zaten yorum var mı kontrol et
          const existingReview = await Review.findOne({ booking: booking._id });
          if (existingReview) {
            continue;
          }

          const rating = getRandomRating();
          const review = {
            property: booking.property._id || booking.property,
            booking: booking._id,
            user: booking.guest ? (booking.guest._id || booking.guest) : null,
            rating: {
              overall: rating,
              cleanliness: getRandomSubRating(),
              location: getRandomSubRating(),
              value: getRandomSubRating(),
              communication: getRandomSubRating()
            },
            comment: getRandomElement(sampleComments),
            isVerified: true,
            createdAt: booking.checkOut || new Date() // Rezervasyon bitiş tarihi
          };

          reviewsToCreate.push(review);
        }
      }

      // Eğer yeterli rezervasyon yoksa, ekstra yorumlar oluştur
      if (reviewsToCreate.length < 10) {
        const users = await User.find({ role: 'user' }).limit(20);
        const properties = await Property.find({ isActive: true }).limit(20);

        const needed = 10 - reviewsToCreate.length;
        for (let i = 0; i < needed && users.length > 0 && properties.length > 0; i++) {
          const user = getRandomElement(users);
          const property = getRandomElement(properties);
          const rating = getRandomRating();
          const fakeBookingId = new mongoose.Types.ObjectId();

          const review = {
            property: property._id,
            booking: fakeBookingId,
            user: user._id,
            rating: {
              overall: rating,
              cleanliness: getRandomSubRating(),
              location: getRandomSubRating(),
              value: getRandomSubRating(),
              communication: getRandomSubRating()
            },
            comment: getRandomElement(sampleComments),
            isVerified: true,
            createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
          };

          reviewsToCreate.push(review);
        }
      }

      if (reviewsToCreate.length > 0) {
        await Review.insertMany(reviewsToCreate);
        console.log(`✅ ${reviewsToCreate.length} yorum oluşturuldu!`);
      } else {
        console.log('⚠️ Yorum oluşturulmadı');
      }
    }

    // 4. Son kontrol
    const finalCount = await Review.countDocuments({});
    console.log(`📊 Toplam yorum sayısı: ${finalCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

seedReviews();

