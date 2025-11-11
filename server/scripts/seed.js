const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gunluk-kiralik-evim';

const galleryPool = [
  'https://images.unsplash.com/photo-1505692794403-34d4982f88aa?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1521783593447-5702d05c3ca3?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=1200&auto=format&fit=crop'
];

function pickImages(n = 4) {
  const shuffled = [...galleryPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n).map((url, i) => ({ url, caption: `Görsel ${i + 1}` }));
}

const sampleProperties = [
  {
    title: 'Şık ve Modern 1+1 Daire - Konyaaltı',
    description: 'Konyaaltı sahiline 5 dakika mesafede, tamamen yenilenmiş ve ferah 1+1 daire. Denize çok yakın, tüm ihtiyaçlarınızı karşılayacak şekilde döşenmiş.',
    location: {
      city: 'Antalya',
      district: 'Konyaaltı',
      neighborhood: 'Arapsuyu',
      address: 'Atatürk Bulvarı No:123'
    },
    propertyType: '1+1',
    size: 65,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ['WiFi', 'Klima', 'TV', 'Balkon', 'Asansör'],
    images: pickImages(),
    pricing: {
      daily: 450,
      weekly: 2800,
      monthly: 11000
    },
    rules: ['Sigara içilmez', 'Evcil hayvan kabul edilmez', 'Saat 22:00\'den sonra gürültü yapılmaz'],
    nearbyAttractions: [
      { name: 'Konyaaltı Plajı', distance: '200 metre', type: 'Plaj' },
      { name: 'Antalya Müzesi', distance: '1.5 km', type: 'Müze' }
    ],
    isActive: true,
    listingType: 'rent_daily'
  },
  {
    title: 'Geniş 2+1 Daire - Lara',
    description: 'Lara bölgesinde, şehir merkezine yakın konumda 2+1 geniş ve konforlu daire. Balkonu ve geniş oturma alanı ile aileler için ideal.',
    location: {
      city: 'Antalya',
      district: 'Lara',
      neighborhood: 'Çamlıbel',
      address: 'Lara Caddesi No:45'
    },
    propertyType: '2+1',
    size: 95,
    bedrooms: 2,
    bathrooms: 1,
    amenities: ['WiFi', 'Klima', 'TV', 'Balkon', 'Bulaşık Makinesi', 'Çamaşır Makinesi'],
    images: pickImages(),
    pricing: {
      daily: 650,
      weekly: 4000,
      monthly: 15000
    },
    rules: ['Parti yapılmaz', 'Evcil hayvan kabul edilmez'],
    nearbyAttractions: [
      { name: 'Lara Plajı', distance: '300 metre', type: 'Plaj' },
      { name: 'Aquarium', distance: '2 km', type: 'Eğlence' }
    ],
    isActive: true,
    listingType: 'sale'
  },
  {
    title: 'Konforlu 3+1 Villa Tarzı Daire - Muratpaşa',
    description: 'Muratpaşa merkezde, eski Antalya\'nın tarihi dokusuna yakın, şık ve konforlu 3+1 daire. Restoranlar ve alışveriş merkezlerine çok yakın.',
    location: {
      city: 'Antalya',
      district: 'Muratpaşa',
      neighborhood: 'Kaleiçi',
      address: 'Kaleiçi Sokak No:12'
    },
    propertyType: '3+1',
    size: 130,
    bedrooms: 3,
    bathrooms: 2,
    amenities: ['WiFi', 'Klima', 'TV', 'Balkon', 'Bulaşık Makinesi', 'Çamaşır Makinesi', 'Ocak', 'Fırın'],
    images: pickImages(),
    pricing: {
      daily: 850,
      weekly: 5200,
      monthly: 20000
    },
    rules: ['Sigara içilmez'],
    nearbyAttractions: [
      { name: 'Kaleiçi', distance: '100 metre', type: 'Tarihi Bölge' },
      { name: 'Hadrianus Kapısı', distance: '200 metre', type: 'Tarihi Yapı' }
    ],
    isActive: true,
    listingType: 'rent_daily'
  },
  {
    title: 'Ekonomik 1+0 Stüdyo - Kepez',
    description: 'Kepez bölgesinde, şehir merkezine 10 dakika mesafede ekonomik ve temiz 1+0 stüdyo daire. Tek kişi veya çiftler için ideal.',
    location: {
      city: 'Antalya',
      district: 'Kepez',
      neighborhood: 'Yıldız',
      address: 'Cumhuriyet Caddesi No:78'
    },
    propertyType: '1+0',
    size: 40,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ['WiFi', 'Klima', 'TV'],
    images: pickImages(),
    pricing: {
      daily: 250,
      weekly: 1500,
      monthly: 5500
    },
    rules: ['Sigara içilmez'],
    nearbyAttractions: [
      { name: 'Şehir Merkezi', distance: '5 km', type: 'Şehir' }
    ],
    isActive: true,
    listingType: 'rent_monthly'
  },
  {
    title: 'Lüks 4+1 Geniş Daire - Konyaaltı',
    description: 'Konyaaltı\'nın en gözde bölgesinde, deniz manzaralı lüks 4+1 daire. Geniş salon, 4 yatak odası ve 2 banyo ile büyük aileler için mükemmel.',
    location: {
      city: 'Antalya',
      district: 'Konyaaltı',
      neighborhood: 'Kültür',
      address: 'Atatürk Caddesi No:234'
    },
    propertyType: '4+1',
    size: 180,
    bedrooms: 4,
    bathrooms: 2,
    amenities: ['WiFi', 'Klima', 'TV', 'Balkon', 'Bulaşık Makinesi', 'Çamaşır Makinesi', 'Ocak', 'Fırın', 'Mikrodalga'],
    images: pickImages(),
    pricing: {
      daily: 1200,
      weekly: 7500,
      monthly: 28000
    },
    rules: ['Parti yapılmaz', 'Evcil hayvan kabul edilmez'],
    nearbyAttractions: [
      { name: 'Konyaaltı Plajı', distance: '400 metre', type: 'Plaj' },
      { name: 'Aqualand', distance: '1 km', type: 'Eğlence' }
    ],
    isActive: true,
    listingType: 'sale'
  },
  {
    title: 'Rahat 2+1 Daire - Döşemealtı',
    description: 'Döşemealtı bölgesinde, sakin ve huzurlu bir semtte 2+1 rahat daire. Havalimanına yakın, şehir gürültüsünden uzak.',
    location: {
      city: 'Antalya',
      district: 'Döşemealtı',
      neighborhood: 'Yeşilbahçe',
      address: 'Çağlayan Sokak No:56'
    },
    propertyType: '2+1',
    size: 100,
    bedrooms: 2,
    bathrooms: 1,
    amenities: ['WiFi', 'Klima', 'TV', 'Balkon', 'Bulaşık Makinesi'],
    images: pickImages(),
    pricing: {
      daily: 550,
      weekly: 3400,
      monthly: 13000
    },
    rules: ['Sigara içilmez'],
    nearbyAttractions: [
      { name: 'Antalya Havalimanı', distance: '8 km', type: 'Ulaşım' }
    ],
    isActive: true,
    listingType: 'rent_monthly'
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('MongoDB bağlantısı başarılı');

    // Admin kullanıcısını bul
    const admin = await User.findOne({ email: 'admin' });
    if (!admin) {
      console.log('Admin kullanıcısı bulunamadı. Önce admin kullanıcısı oluşturun.');
      await mongoose.connection.close();
      process.exit(1);
    }

    // Mevcut daireleri kontrol et
    const existingProperties = await Property.countDocuments();
    const existingBookings = await Booking.countDocuments();
    
    if (existingProperties > 0 && existingBookings > 0) {
      console.log(`Veritabanında zaten ${existingProperties} daire ve ${existingBookings} rezervasyon var. Seed atlanıyor.`);
      await mongoose.connection.close();
      process.exit(0);
    }
    
    // Daireleri ekle (eğer yoksa)
    console.log('Daireler ekleniyor...');
    let properties = [];
    
    if (existingProperties === 0) {
      // Eğer hiç daire yoksa, hepsini ekle
      for (const propData of sampleProperties) {
        const property = new Property({
          ...propData,
          owner: admin._id
        });
        await property.save();
        properties.push(property);
        console.log(`✓ ${propData.title} eklendi`);
      }
    } else {
      // Mevcut daireleri kullan
      properties = await Property.find().limit(6);
      console.log(`Mevcut ${properties.length} daire kullanılıyor`);
    }

    // Örnek rezervasyonlar ekle
    console.log('\nRezervasyonlar ekleniyor...');
    
    // Geçmiş rezervasyon
    const pastBooking = new Booking({
      property: properties[0]._id,
      guest: admin._id,
      checkIn: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 gün önce
      checkOut: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 gün önce
      guests: { adults: 2, children: 0 },
      guestInfo: {
        name: 'Ahmet Yılmaz',
        email: 'ahmet@example.com',
        phone: '05551234567'
      },
      pricing: {
        dailyRate: 450,
        totalDays: 3,
        subtotal: 1350,
        serviceFee: 135,
        tax: 108,
        total: 1593
      },
      payment: {
        method: 'cash',
        status: 'completed'
      },
      status: 'completed'
    });
    await pastBooking.save();
    console.log('✓ Geçmiş rezervasyon eklendi');

    // Yakın gelecekteki rezervasyon
    const futureBooking = new Booking({
      property: properties[1]._id,
      guest: admin._id,
      checkIn: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 gün sonra
      checkOut: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 gün sonra
      guests: { adults: 4, children: 1 },
      guestInfo: {
        name: 'Ayşe Demir',
        email: 'ayse@example.com',
        phone: '05559876543'
      },
      pricing: {
        dailyRate: 650,
        totalDays: 3,
        subtotal: 1950,
        serviceFee: 195,
        tax: 156,
        total: 2301
      },
      payment: {
        method: 'cash',
        status: 'pending'
      },
      status: 'confirmed'
    });
    await futureBooking.save();
    console.log('✓ Gelecek rezervasyon eklendi');

    // Bekleyen talep
    const pendingBooking = new Booking({
      property: properties[2]._id,
      guest: admin._id,
      checkIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 gün sonra
      checkOut: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 gün sonra
      guests: { adults: 6, children: 0 },
      guestInfo: {
        name: 'Mehmet Kaya',
        email: 'mehmet@example.com',
        phone: '05555555555',
        notes: 'Sabah erken saatte giriş yapmak istiyoruz'
      },
      pricing: {
        dailyRate: 850,
        totalDays: 3,
        subtotal: 2550,
        serviceFee: 255,
        tax: 204,
        total: 3009
      },
      payment: {
        method: 'cash',
        status: 'pending'
      },
      status: 'pending_request'
    });
    await pendingBooking.save();
    console.log('✓ Bekleyen rezervasyon talebi eklendi');

    console.log('\n✓ Seed işlemi tamamlandı!');
    console.log(`  - ${properties.length} daire eklendi`);
    console.log(`  - 3 rezervasyon eklendi`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seed();

