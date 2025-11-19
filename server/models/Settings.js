const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Settings = sequelize.define('Settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  maintenanceMode: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'maintenance_mode'
  },
  maintenanceMessage: {
    type: DataTypes.TEXT,
    defaultValue: 'Sitemiz kısa süreli bakımdadır.',
    field: 'maintenance_message'
  },
  contactEmail: {
    type: DataTypes.STRING,
    defaultValue: 'info@example.com',
    field: 'contact_email'
  },
  contactPhone: {
    type: DataTypes.STRING,
    defaultValue: '+90 555 555 55 55',
    field: 'contact_phone'
  },
  contactAddress: {
    type: DataTypes.TEXT,
    defaultValue: 'Atatürk Cad. No:123, Muratpaşa, Antalya',
    field: 'contact_address'
  },
  openingHours: {
    type: DataTypes.STRING,
    defaultValue: 'Pazartesi - Pazar: 09:00 - 22:00 (7/24 Acil Destek)',
    field: 'opening_hours'
  },
  mapEmbedUrl: {
    type: DataTypes.TEXT,
    defaultValue: 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d199.48501896733512!2d30.81925443004665!3d36.8721558418272!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1str!2str!4v1762164311741!5m2!1str!2str',
    field: 'map_embed_url'
  },
  instagramUrl: {
    type: DataTypes.STRING,
    defaultValue: '',
    field: 'instagram_url'
  },
  footerNotice: {
    type: DataTypes.STRING,
    defaultValue: 'Tüm hakları saklıdır.',
    field: 'footer_notice'
  },
  footerYear: {
    type: DataTypes.INTEGER,
    defaultValue: new Date().getFullYear(),
    field: 'footer_year'
  },
  visionText: {
    type: DataTypes.TEXT,
    defaultValue: "Antalya'da kısa ve uzun dönem konaklamanın güvenilir, ulaşılabilir ve ilk akla gelen platformu olmak. Misafirlerimizin konforunu ve memnuniyetini merkeze alarak; modern tasarımlı, temiz ve denetlenmiş dairelerle kusursuz bir deneyim sunmayı, yerel işletmelerle iş birlikleri kurarak şehrin yaşamına değer katmayı hedefliyoruz.",
    field: 'vision_text'
  },
  missionText: {
    type: DataTypes.TEXT,
    defaultValue: 'Her bütçeye ve ihtiyaca uygun, özenle seçilmiş daireleri şeffaf fiyatlandırma, hızlı iletişim ve güvenli rezervasyon süreçleriyle buluşturmak. Misafirlerimize, girişten çıkışa kadar her adımda yanlarında olduğumuzu hissettiren, beklentileri aşan bir hizmet deneyimi sunmak için çalışıyoruz.',
    field: 'mission_text'
  },
  statsHappyGuests: {
    type: DataTypes.STRING,
    defaultValue: '999+',
    field: 'stats_happy_guests'
  },
  statsAvgRating: {
    type: DataTypes.STRING,
    defaultValue: '4.8',
    field: 'stats_avg_rating'
  },
  statsSupport: {
    type: DataTypes.STRING,
    defaultValue: '7/24',
    field: 'stats_support'
  },
  siteTitle: {
    type: DataTypes.STRING,
    defaultValue: 'Günlük Kiralık Evim',
    field: 'site_title'
  },
  siteIcon: {
    type: DataTypes.STRING,
    defaultValue: 'FaHome',
    field: 'site_icon'
  },
  siteLogoUrl: {
    type: DataTypes.STRING,
    defaultValue: '',
    field: 'site_logo_url'
  },
  siteLogoWidth: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'site_logo_width'
  },
  siteLogoHeight: {
    type: DataTypes.INTEGER,
    defaultValue: 24,
    field: 'site_logo_height'
  },
  commissionRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    field: 'commission_rate'
  },
  extraAdultPrice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 150,
    field: 'extra_adult_price'
  },
  extraChildPrice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 75,
    field: 'extra_child_price'
  },
  includedAdultsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 2,
    field: 'included_adults_count'
  },
  includedChildrenCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'included_children_count'
  },
  defaultSeoTitle: {
    type: DataTypes.STRING,
    defaultValue: 'Antalya Günlük Kiralık Daireler',
    field: 'default_seo_title'
  },
  defaultSeoDescription: {
    type: DataTypes.STRING,
    defaultValue: 'Antalya\'da en iyi günlük kiralık daireler',
    field: 'default_seo_description'
  }
}, {
  tableName: 'settings',
  timestamps: true
});

// Mongoose uyumluluğu için toJSON
Settings.prototype.toJSON = function() {
  const values = { ...this.get() };
  values._id = values.id;
  delete values.id;
  
  values.defaultSeo = {
    title: values.defaultSeoTitle,
    description: values.defaultSeoDescription
  };
  delete values.defaultSeoTitle;
  delete values.defaultSeoDescription;
  
  return values;
};

module.exports = Settings;
