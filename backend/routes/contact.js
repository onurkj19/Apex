const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Validation middleware
const validateContactForm = (req, res, next) => {
  const { name, email, message } = req.body;
  
  if (!name || !email || !message) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Name, email, and message are required'
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Invalid email format',
      message: 'Please provide a valid email address'
    });
  }

  // Check message length
  if (message.length < 10) {
    return res.status(400).json({
      error: 'Message too short',
      message: 'Message must be at least 10 characters long'
    });
  }

  next();
};

// POST /api/contact - Submit contact form
router.post('/', validateContactForm, async (req, res) => {
  try {
    const { name, email, message, phone, subject } = req.body;

    // Create email content
    const emailContent = `
      <h2>Neue Kontaktanfrage von der Website</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${phone ? `<p><strong>Telefon:</strong> ${phone}</p>` : ''}
      ${subject ? `<p><strong>Betreff:</strong> ${subject}</p>` : ''}
      <p><strong>Nachricht:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <hr>
      <p><em>Diese Nachricht wurde automatisch von der Apex Gerüstbau Website gesendet.</em></p>
    `;

    // Send email to company
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to company email
      replyTo: email,
      subject: `Neue Kontaktanfrage: ${subject || 'Allgemeine Anfrage'}`,
      html: emailContent,
    };

    await transporter.sendMail(mailOptions);

    // Send confirmation email to customer
    const confirmationContent = `
      <h2>Vielen Dank für Ihre Nachricht!</h2>
      <p>Hallo ${name},</p>
      <p>Wir haben Ihre Nachricht erhalten und werden uns innerhalb von 24 Stunden bei Ihnen melden.</p>
      <p><strong>Ihre Nachricht:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <hr>
      <p>Mit freundlichen Grüßen,<br>Das Team von Apex Gerüstbau</p>
    `;

    const confirmationMail = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Bestätigung Ihrer Anfrage - Apex Gerüstbau',
      html: confirmationContent,
    };

    await transporter.sendMail(confirmationMail);

    res.status(200).json({
      success: true,
      message: 'Ihre Nachricht wurde erfolgreich gesendet. Sie erhalten eine Bestätigungsemail.'
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({
      error: 'Failed to send email',
      message: 'Es gab ein Problem beim Senden Ihrer Nachricht. Bitte versuchen Sie es später erneut.'
    });
  }
});

// GET /api/contact - Get contact information
router.get('/', (req, res) => {
  res.json({
    company: {
      name: 'Apex Gerüstbau',
      email: 'info@apex-gerüste.ch',
      phone: '+41 76 123 45 67',
      address: {
        street: 'Musterstraße 123',
        city: 'Zürich',
        postal: '8000',
        country: 'Schweiz'
      },
      hours: 'Mo-Fr: 8:00-18:00, Sa: 9:00-12:00'
    },
    emergency: {
      phone: '+41 76 123 45 68',
      available: '24/7'
    }
  });
});

module.exports = router; 