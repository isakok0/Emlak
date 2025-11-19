const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'property_id',
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  guestId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'guest_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  checkIn: {
    type: DataTypes.DATE,
    allowNull: false
  },
  checkOut: {
    type: DataTypes.DATE,
    allowNull: false
  },
  guestsAdults: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'guests_adults'
  },
  guestsChildren: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'guests_children'
  },
  pricingDailyRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'pricing_daily_rate'
  },
  pricingTotalDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'pricing_total_days'
  },
  pricingSubtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'pricing_subtotal'
  },
  pricingServiceFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'pricing_service_fee'
  },
  pricingTax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'pricing_tax'
  },
  pricingTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'pricing_total'
  },
  paymentMethod: {
    type: DataTypes.ENUM('credit_card', 'bank_transfer', 'cash', 'deposit'),
    allowNull: false,
    field: 'payment_method'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending',
    field: 'payment_status'
  },
  paymentTransactionId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'payment_transaction_id'
  },
  paymentPaidAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'payment_paid_at'
  },
  status: {
    type: DataTypes.ENUM('pending_request', 'confirmed', 'cancelled', 'completed'),
    defaultValue: 'pending_request'
  },
  requestType: {
    type: DataTypes.ENUM('web', 'manual'),
    defaultValue: 'web',
    field: 'request_type'
  },
  guestInfo: {
    type: DataTypes.JSON,
    allowNull: false
  },
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'admin_notes'
  },
  communicationLog: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'communication_log'
  },
  policiesAccepted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'policies_accepted'
  },
  policiesAcceptedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'policies_accepted_at'
  },
  cancellationPolicy: {
    type: DataTypes.STRING,
    defaultValue: 'flexible',
    field: 'cancellation_policy'
  }
}, {
  tableName: 'bookings',
  timestamps: true,
  hooks: {
    beforeSave: (booking) => {
      if (booking.checkIn && booking.checkOut) {
        const diffTime = Math.abs(new Date(booking.checkOut) - new Date(booking.checkIn));
        booking.pricingTotalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }
  }
});

// Mongoose uyumluluğu için toJSON
Booking.prototype.toJSON = function() {
  try {
    const rawValues = this.get({ plain: true });
    const values = { ...rawValues };
    
    values._id = values.id;
    delete values.id;
    
    // Include edilen ilişkiler varsa koru, yoksa propertyId'yi kullan
    if (!values.property && values.propertyId) {
      values.property = values.propertyId;
    }
    delete values.propertyId;
    
    // Include edilen ilişkiler varsa koru, yoksa guestId'yi kullan
    if (!values.guest && values.guestId) {
      values.guest = values.guestId;
    }
    delete values.guestId;
    
    // Guests objesi oluştur
    if (!values.guests) {
      values.guests = {
        adults: values.guestsAdults || 1,
        children: values.guestsChildren || 0
      };
    }
    delete values.guestsAdults;
    delete values.guestsChildren;
    
    // Pricing objesi oluştur
    if (!values.pricing) {
      values.pricing = {
        dailyRate: parseFloat(values.pricingDailyRate) || 0,
        totalDays: values.pricingTotalDays || 0,
        subtotal: parseFloat(values.pricingSubtotal) || 0,
        serviceFee: parseFloat(values.pricingServiceFee) || 0,
        tax: parseFloat(values.pricingTax) || 0,
        total: parseFloat(values.pricingTotal) || 0
      };
    }
    delete values.pricingDailyRate;
    delete values.pricingTotalDays;
    delete values.pricingSubtotal;
    delete values.pricingServiceFee;
    delete values.pricingTax;
    delete values.pricingTotal;
    
    // Payment objesi oluştur
    if (!values.payment) {
      values.payment = {
        method: values.paymentMethod || 'cash',
        status: values.paymentStatus || 'pending',
        transactionId: values.paymentTransactionId || null,
        paidAt: values.paymentPaidAt || null
      };
    }
    delete values.paymentMethod;
    delete values.paymentStatus;
    delete values.paymentTransactionId;
    delete values.paymentPaidAt;
    
    // Ensure communicationLog is always an array
    if (!Array.isArray(values.communicationLog)) {
      values.communicationLog = [];
    }
    
    // Ensure guestInfo is properly formatted
    if (values.guestInfo && typeof values.guestInfo === 'string') {
      try {
        values.guestInfo = JSON.parse(values.guestInfo);
      } catch (e) {
        // Parse hatası durumunda olduğu gibi bırak
      }
    }
    
    return values;
  } catch (error) {
    console.error('Booking toJSON error:', error);
    // Hata durumunda minimal response döndür
    return {
      _id: this.id || this.get('id'),
      propertyId: this.propertyId || this.get('propertyId'),
      checkIn: this.checkIn || this.get('checkIn'),
      checkOut: this.checkOut || this.get('checkOut'),
      status: this.status || this.get('status'),
      createdAt: this.createdAt || this.get('createdAt'),
      updatedAt: this.updatedAt || this.get('updatedAt')
    };
  }
};

module.exports = Booking;
