const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  maintenanceMode: { type: Boolean, default: false },
  maintenanceMessage: { type: String, default: 'Sitemiz kısa süreli bakımdadır.' },
  contactEmail: { type: String, default: 'info@example.com' },
  contactPhone: { type: String, default: '+90 555 555 55 55' },
  contactAddress: { type: String, default: 'Atatürk Cad. No:123, Muratpaşa, Antalya' },
  openingHours: { type: String, default: 'Pazartesi - Pazar: 09:00 - 22:00 (7/24 Acil Destek)' },
  mapEmbedUrl: { type: String, default: 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d199.48501896733512!2d30.81925443004665!3d36.8721558418272!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1str!2str!4v1762164311741!5m2!1str!2str' },
  instagramUrl: { type: String, default: '' },
  footerNotice: { type: String, default: 'Tüm hakları saklıdır.' },
  footerYear: { type: Number, default: new Date().getFullYear() },
  visionText: { type: String, default: "Antalya'da kısa ve uzun dönem konaklamanın güvenilir, ulaşılabilir ve ilk akla gelen platformu olmak. Misafirlerimizin konforunu ve memnuniyetini merkeze alarak; modern tasarımlı, temiz ve denetlenmiş dairelerle kusursuz bir deneyim sunmayı, yerel işletmelerle iş birlikleri kurarak şehrin yaşamına değer katmayı hedefliyoruz." },
  missionText: { type: String, default: 'Her bütçeye ve ihtiyaca uygun, özenle seçilmiş daireleri şeffaf fiyatlandırma, hızlı iletişim ve güvenli rezervasyon süreçleriyle buluşturmak. Misafirlerimize, girişten çıkışa kadar her adımda yanlarında olduğumuzu hissettiren, beklentileri aşan bir hizmet deneyimi sunmak için çalışıyoruz.' },
  statsHappyGuests: { type: String, default: '999+' },
  statsAvgRating: { type: String, default: '4.8' },
  statsSupport: { type: String, default: '7/24' },
  siteTitle: { type: String, default: 'Günlük Kiralık Evim' },
  siteIcon: { type: String, default: 'FaHome' },
  siteLogoUrl: { type: String, default: '' },
  siteLogoWidth: { type: Number, default: 0 },
  siteLogoHeight: { type: Number, default: 24 },
  commissionRate: { type: Number, default: 0 },
  extraAdultPrice: { type: Number, default: 150 },
  extraChildPrice: { type: Number, default: 75 },
  includedAdultsCount: { type: Number, default: 2 },
  includedChildrenCount: { type: Number, default: 1 },
  defaultSeo: {
    title: { type: String, default: 'Antalya Günlük Kiralık Daireler' },
    description: { type: String, default: 'Antalya’da en iyi günlük kiralık daireler' }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', settingsSchema);


