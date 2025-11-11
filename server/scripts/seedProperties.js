/*
  Seed 10 sample properties with images.
  Usage inside container: node server/scripts/seedProperties.js
*/
const mongoose = require('mongoose');
const Property = require('../models/Property');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gunluk-kiralik-evim';

async function run() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const owner = new mongoose.Types.ObjectId('69086a64a0113c0849954f5d');
  const mk = (url) => ({ url });

  const props = [
    {
      title: 'Lüks 4+1 – Konyaaltı Premium',
      description: 'Deniz manzaralı, modern 4+1 daire.',
      location: { city: 'Antalya', district: 'Konyaaltı' },
      propertyType: '4+1',
      listingType: 'rent_daily',
      isFeatured: true,
      ownerVerified: true,
      size: 180,
      bedrooms: 4,
      bathrooms: 2,
      amenities: ['WiFi', 'Klima', 'TV', 'Balkon'],
      images: [
        mk('https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200'),
        mk('https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200'),
        mk('https://images.unsplash.com/photo-1502673530728-f79b4cab31b1?w=1200')
      ],
      pricing: { daily: 2500, weekly: 16000, monthly: 0 },
      owner
    },
    {
      title: 'Şık Stüdyo 1+0 – Kepez',
      description: 'Minimal ve şık stüdyo.',
      location: { city: 'Antalya', district: 'Kepez' },
      propertyType: '1+0',
      listingType: 'rent_daily',
      isFeatured: true,
      ownerVerified: true,
      size: 35,
      bedrooms: 1,
      bathrooms: 1,
      amenities: ['WiFi', 'Klima'],
      images: [
        mk('https://images.unsplash.com/photo-1501183638710-841dd1904471?w=1200'),
        mk('https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=1200')
      ],
      pricing: { daily: 700, weekly: 4500, monthly: 0 },
      owner
    },
    {
      title: 'Geniş 3+1 – Muratpaşa',
      description: 'Aileler için ideal 3+1.',
      location: { city: 'Antalya', district: 'Muratpaşa' },
      propertyType: '3+1',
      listingType: 'rent_monthly',
      isFeatured: false,
      ownerVerified: true,
      size: 140,
      bedrooms: 3,
      bathrooms: 1,
      amenities: ['WiFi', 'Klima', 'Otopark'],
      images: [
        mk('https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?w=1200'),
        mk('https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=1200')
      ],
      pricing: { daily: 0, weekly: 0, monthly: 19000 },
      owner
    },
    {
      title: 'Modern 2+1 – Lara',
      description: 'Lara’da modern 2+1.',
      location: { city: 'Antalya', district: 'Lara' },
      propertyType: '2+1',
      listingType: 'sale',
      isFeatured: false,
      ownerVerified: true,
      size: 110,
      bedrooms: 2,
      bathrooms: 1,
      amenities: ['WiFi', 'Asansör', 'Balkon'],
      images: [
        mk('https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=1200'),
        mk('https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200')
      ],
      pricing: { daily: 0, weekly: 0, monthly: 0 },
      owner
    },
    {
      title: 'Denize Yakın 1+1 – Konyaaltı',
      description: 'Plaja yürüme mesafesi 1+1.',
      location: { city: 'Antalya', district: 'Konyaaltı' },
      propertyType: '1+1',
      listingType: 'rent_daily',
      isFeatured: true,
      ownerVerified: false,
      size: 55,
      bedrooms: 1,
      bathrooms: 1,
      amenities: ['WiFi', 'Klima', 'TV'],
      images: [
        mk('https://images.unsplash.com/photo-1527030280862-64139fba04ca?w=1200')
      ],
      pricing: { daily: 900, weekly: 6000, monthly: 0 },
      owner
    },
    {
      title: 'Bahçeli 2+1 – Kepez',
      description: 'Bahçe kullanım alanlı 2+1.',
      location: { city: 'Antalya', district: 'Kepez' },
      propertyType: '2+1',
      listingType: 'rent_monthly',
      isFeatured: false,
      ownerVerified: false,
      size: 95,
      bedrooms: 2,
      bathrooms: 1,
      amenities: ['Bahçe', 'Otopark'],
      images: [
        mk('https://images.unsplash.com/photo-1506344000169-339b0c0b37d4?w=1200')
      ],
      pricing: { daily: 0, weekly: 0, monthly: 15000 },
      owner
    },
    {
      title: 'Lüks Dubleks 3+1 – Konyaaltı',
      description: 'Geniş teraslı dubleks.',
      location: { city: 'Antalya', district: 'Konyaaltı' },
      propertyType: '3+1',
      listingType: 'sale',
      isFeatured: true,
      ownerVerified: true,
      size: 200,
      bedrooms: 3,
      bathrooms: 2,
      amenities: ['Teras', 'Manzara', 'Klima'],
      images: [
        mk('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200')
      ],
      pricing: { daily: 0, weekly: 0, monthly: 0 },
      owner
    },
    {
      title: 'Şehir Manzaralı 1+1 – Muratpaşa',
      description: 'Yüksek kat şehir manzarası.',
      location: { city: 'Antalya', district: 'Muratpaşa' },
      propertyType: '1+1',
      listingType: 'rent_daily',
      isFeatured: false,
      ownerVerified: false,
      size: 60,
      bedrooms: 1,
      bathrooms: 1,
      amenities: ['Asansör', 'WiFi'],
      images: [
        mk('https://images.unsplash.com/photo-1486304873000-235643847519?w=1200')
      ],
      pricing: { daily: 800, weekly: 5200, monthly: 0 },
      owner
    },
    {
      title: 'Site İçinde 2+1 – Kepez',
      description: 'Site içi sosyal alanlı.',
      location: { city: 'Antalya', district: 'Kepez' },
      propertyType: '2+1',
      listingType: 'rent_monthly',
      isFeatured: false,
      ownerVerified: true,
      size: 100,
      bedrooms: 2,
      bathrooms: 1,
      amenities: ['Havuz', 'Güvenlik'],
      images: [
        mk('https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200')
      ],
      pricing: { daily: 0, weekly: 0, monthly: 17000 },
      owner
    },
    {
      title: 'Villa 4+1 – Döşemealtı',
      description: 'Müstakil havuzlu villa.',
      location: { city: 'Antalya', district: 'Döşemealtı' },
      propertyType: '4+1',
      listingType: 'rent_daily',
      isFeatured: true,
      ownerVerified: true,
      size: 260,
      bedrooms: 4,
      bathrooms: 3,
      amenities: ['Havuz', 'Otopark', 'Klima', 'Barbekü'],
      images: [
        mk('https://images.unsplash.com/photo-1502005229762-cf1b2da7c52f?w=1200'),
        mk('https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200')
      ],
      pricing: { daily: 4200, weekly: 28000, monthly: 0 },
      owner
    }
  ];

  await Property.deleteMany({});
  const res = await Property.insertMany(props);
  console.log('Inserted properties:', res.length);
  await mongoose.disconnect();
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });


