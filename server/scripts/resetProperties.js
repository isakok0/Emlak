const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Property = require('../models/Property');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gunluk-kiralik-evim';

const galleryPool = [
  'https://images.unsplash.com/photo-1505692794403-34d4982f88aa?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1521783593447-5702d05c3ca3?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1523217582562-09d0def993a6?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop'
];

function pickImages(n = 5) {
  const shuffled = [...galleryPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n).map((url, i) => ({ url, caption: `Görsel ${i + 1}` }));
}

const baseProps = [
  { title: 'Panoramik Manzaralı 1+1 – Konyaaltı', propertyType: '1+1', size: 60, bedrooms: 1, bathrooms: 1, daily: 900, district: 'Konyaaltı' },
  { title: 'Modern 2+1 – Lara', propertyType: '2+1', size: 95, bedrooms: 2, bathrooms: 1, daily: 1400, district: 'Lara' },
  { title: 'Geniş 3+1 – Muratpaşa', propertyType: '3+1', size: 130, bedrooms: 3, bathrooms: 2, daily: 1900, district: 'Muratpaşa' },
  { title: 'Şık Stüdyo 1+0 – Kepez', propertyType: '1+0', size: 40, bedrooms: 1, bathrooms: 1, daily: 700, district: 'Kepez' },
  { title: 'Lüks 4+1 – Konyaaltı', propertyType: '4+1', size: 180, bedrooms: 4, bathrooms: 2, daily: 2500, district: 'Konyaaltı' }
];

async function run() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('MongoDB bağlantısı kuruldu');

  const admin = await User.findOne({ email: 'admin' });
  if (!admin) {
    console.error('Admin bulunamadı. Önce admin oluşturun.');
    process.exit(1);
  }

  // Mevcut daireleri sil
  const del = await Property.deleteMany({});
  console.log(`Silinen daire: ${del.deletedCount}`);

  // 5 yeni daire oluştur
  for (const p of baseProps) {
    const listingType = Math.random() > 0.6 ? 'sale' : (Math.random() > 0.5 ? 'rent_daily' : 'rent_monthly');
    const doc = new Property({
      title: p.title,
      description: `${p.district} bölgesinde modern ve bakımlı ${p.propertyType} daire.`,
      location: { city: 'Antalya', district: p.district },
      propertyType: p.propertyType,
      size: p.size,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      amenities: ['WiFi', 'Klima', 'TV', 'Balkon'],
      images: pickImages(5),
      pricing: { daily: p.daily },
      owner: admin._id,
      isActive: true,
      isFeatured: Math.random() > 0.4,
      listingType
    });
    await doc.save();
    console.log('✓ Eklendi:', p.title);
  }

  console.log('Yeni daireler hazır.');
  await mongoose.connection.close();
  process.exit(0);
}

run().catch(async (e)=>{ console.error(e); await mongoose.connection.close(); process.exit(1); });


