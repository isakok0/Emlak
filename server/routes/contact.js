const express = require('express');
const { body, validationResult } = require('express-validator');
const ContactMessage = require('../models/ContactMessage');

const router = express.Router();

// Public: submit contact message
router.post('/', [
  body('name').notEmpty().withMessage('İsim gereklidir'),
  body('email').isEmail().withMessage('Geçerli bir e-posta giriniz'),
  body('phone').notEmpty().withMessage('Telefon gereklidir'),
  body('subject').notEmpty().withMessage('Konu gereklidir'),
  body('message').notEmpty().withMessage('Mesaj gereklidir')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const msg = new ContactMessage(req.body);
    await msg.save();
    res.status(201).json({ message: 'Mesajınız alınmıştır' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;


