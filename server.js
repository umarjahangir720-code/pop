import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { readDb, writeDb, addSystemLog } from './db.js';
import { hashPassword, generateToken, authenticateUser } from './auth.js';
import { processIncomingMessage } from './automationEngine.js';
import { startCampaignScheduler } from './campaignEngine.js';

import {
  initWhatsApp,
  getLatestQR,
  sendWhatsAppMessage,
  disconnectWhatsApp,
  isSocketActive
} from './whatsappEngine.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Start background scheduler
startCampaignScheduler();

// ==========================================
// 1. AUTHENTICATION & PROFILE ENDPOINTS
// ==========================================

app.post('/api/auth/register', (req, res) => {
  const { email, password, first_name, last_name, phone } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required.'
    });
  }

  const db = readDb();

  const existingUser = db.users.find(
    u => u.email.toLowerCase() === email.toLowerCase()
  );

  if (existingUser) {
    return res.status(400).json({
      error: 'A user with this email already exists.'
    });
  }

  const newUser = {
    id: `usr_${Date.now()}`,
    first_name: first_name || '',
    last_name: last_name || '',
    email: email.toLowerCase(),
    phone: phone || '',
    password_hash: hashPassword(password),
    date_of_birth: '',
    gender: 'Other',
    profile_image: `https://api.dicebear.com/7.x/initials/svg?seed=${first_name || 'U'}`,
    tier: 'free'
  };

  db.users.push(newUser);

  const sessionToken = `sess_${generateToken().substring(0, 16)}`;

  db.sessions.push({
    id: sessionToken,
    user_id: newUser.id,
    status: 'Disconnected',
    device_info: 'Vite App User Session',
    connected_at: null
  });

  writeDb(db);

  addSystemLog(
    'user_register',
    `New user registered: ${email}`
  );

  res.status(201).json({
    token: sessionToken,
    user: newUser
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required.'
    });
  }

  const db = readDb();

  const user = db.users.find(
    u => u.email.toLowerCase() === email.toLowerCase()
  );

  if (!user || user.password_hash !== hashPassword(password)) {
    return res.status(401).json({
      error: 'Invalid email or password.'
    });
  }

  const sessionToken = `sess_${generateToken().substring(0, 16)}`;

  db.sessions.push({
    id: sessionToken,
    user_id: user.id,
    status: 'Disconnected',
    device_info: 'Vite App User Session',
    connected_at: null
  });

  writeDb(db);

  addSystemLog(
    'user_login',
    `User logged in: ${email}`
  );

  res.json({
    token: sessionToken,
    user
  });
});

app.get('/api/auth/me', authenticateUser, (req, res) => {
  const db = readDb();

  const user = db.users.find(
    u => u.id === req.userId
  );

  if (!user) {
    return res.status(404).json({
      error: 'User not found.'
    });
  }

  res.json(user);
});

app.put('/api/auth/profile', authenticateUser, (req, res) => {
  const {
    first_name,
    last_name,
    phone,
    date_of_birth,
    gender,
    profile_image
  } = req.body;

  const db = readDb();

  const index = db.users.findIndex(
    u => u.id === req.userId
  );

  if (index === -1) {
    return res.status(404).json({
      error: 'User not found.'
    });
  }

  db.users[index] = {
    ...db.users[index],
    first_name:
      first_name !== undefined
        ? first_name
        : db.users[index].first_name,

    last_name:
      last_name !== undefined
        ? last_name
        : db.users[index].last_name,

    phone:
      phone !== undefined
        ? phone
        : db.users[index].phone,

    date_of_birth:
      date_of_birth !== undefined
        ? date_of_birth
        : db.users[index].date_of_birth,

    gender:
      gender !== undefined
        ? gender
        : db.users[index].gender,

    profile_image:
      profile_image !== undefined
        ? profile_image
        : db.users[index].profile_image
  };

  writeDb(db);

  addSystemLog(
    'user_profile',
    `User profile updated for: ${db.users[index].email}`
  );

  res.json(db.users[index]);
});

// ==========================================
// 2. WHATSAPP SESSION ENDPOINTS
// ==========================================

app.get('/api/session/status', authenticateUser, (req, res) => {
  const db = readDb();

  let session = db.sessions.find(
    s => s.user_id === req.userId
  );

  if (!session) {
    session = {
      id: `sess_${generateToken().substring(0, 16)}`,
      user_id: req.userId,
      status: 'Disconnected',
      device_info: 'Vite App User Session',
      connected_at: null
    };

    db.sessions.push(session);
    writeDb(db);
  }

  if (
    session.status === 'Connected' &&
    !isSocketActive(req.userId)
  ) {
    initWhatsApp(req.userId, false).catch(err => {
      console.error(err);
    });
  }

  const qrDataUrl = getLatestQR(req.userId);

  res.json({
    ...session,
    qrDataUrl
  });
});

app.post('/api/session/initiate', authenticateUser, async (req, res) => {
  const db = readDb();

  const index = db.sessions.findIndex(
    s => s.user_id === req.userId
  );

  if (index !== -1) {
    db.sessions[index].status = 'Connecting';
    db.sessions[index].connected_at = null;
  }

  writeDb(db);

  try {
    await initWhatsApp(req.userId, true);
  } catch (err) {
    console.error(err);
  }

  res.json({
    success: true,
    status: 'Connecting'
  });
});

app.post('/api/session/disconnect', authenticateUser, async (req, res) => {
  const db = readDb();

  const index = db.sessions.findIndex(
    s => s.user_id === req.userId
  );

  if (index !== -1) {
    db.sessions[index].status = 'Disconnected';
    db.sessions[index].connected_at = null;
  }

  writeDb(db);

  await disconnectWhatsApp(req.userId);

  res.json({
    success: true,
    status: 'Disconnected'
  });
});

// ==========================================
// 3. HEALTH CHECK
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'running'
  });
});

// ==========================================
// STATIC FILE SERVING
// ==========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, 'dist');

// Serve frontend assets
app.use(express.static(distPath));

// FIXED EXPRESS V5 FALLBACK ROUTE
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  addSystemLog(
    'server_start',
    `Backend started on port ${PORT}`
  );

  const autoInitSessions = async () => {
    try {
      const db = readDb();

      let dbChanged = false;

      for (const session of db.sessions) {
        if (session.status === 'Connected') {
          console.log(
            `[Startup] Restoring session for user ${session.user_id}`
          );

          await initWhatsApp(session.user_id, false).catch(err => {
            console.error(err);
          });
        }

        if (
          ['Connecting', 'Authenticating', 'Reconnecting']
            .includes(session.status)
        ) {
          session.status = 'Disconnected';
          dbChanged = true;
        }
      }

      if (dbChanged) {
        writeDb(db);
      }
    } catch (err) {
      console.error(err);
    }
  };

  autoInitSessions();
});
