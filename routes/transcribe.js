const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');
const { requireAuth } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'video/webm'];
    const mimeOk = allowed.some(a => file.mimetype.startsWith(a));
    const extOk = /\.(webm|mp4|mp3|wav|ogg|m4a)$/i.test(file.originalname);
    cb(null, mimeOk || extOk || file.mimetype.startsWith('audio/'));
  }
});

router.post('/', requireAuth, upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nessun file audio ricevuto' });
  }

  try {
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'audio.webm',
      contentType: req.file.mimetype,
    });
    form.append('model', 'whisper-1');
    form.append('language', 'it');
    form.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Whisper error ${response.status}: ${err}`);
    }

    const data = await response.json();
    res.json({ success: true, transcript: data.text, duration: data.duration });
  } catch (e) {
    console.error('Errore Whisper:', e.message);
    res.status(500).json({ error: 'Trascrizione fallita: ' + e.message });
  }
});

module.exports = router;
