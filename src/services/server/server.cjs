
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const cors = require('cors');


const app = express();
app.use(cors()); // Aktifkan CORS untuk semua origin
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const upload = multer({ dest: 'uploads/' }); // folder sementara


const CREDENTIALS_PATH = 'credentials.json';
const TOKEN_PATH = 'token.json';

// Global error handler agar error apapun selalu muncul di terminal
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

function getDriveService() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error('credentials.json not found in ' + process.cwd());
  }
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('token.json not found in ' + process.cwd());
  }
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oAuth2Client.setCredentials(token);
  return google.drive({ version: 'v3', auth: oAuth2Client });
}

app.post('/upload', upload.single('file'), async (req, res) => {
  console.log('UPLOAD route called');
  try {
    if (!req.file) {
      throw new Error('No file uploaded. Field name harus "file".');
    }
    const drive = getDriveService();
    const fileMetadata = {
      name: req.file.originalname,
      parents: ['15qEM_lIuA09Mm63h9kGKG9VzfWyLVcSI'], // Folder Google Drive
    };
    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(req.file.path),
    };
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });
    fs.unlinkSync(req.file.path); // hapus file sementara
    res.json({ success: true, file: response.data });
  } catch (err) {
    console.error('UPLOAD ERROR:', err);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { }
    }
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));