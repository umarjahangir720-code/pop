import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readDb, writeDb, addSystemLog } from './db.js';
import { hashPassword, generateToken, authenticateUser } from './auth.js';
import { processIncomingMessage } from './automationEngine.js';
import { startCampaignScheduler } from './campaignEngine.js';
import { initWhatsApp, getLatestQR, sendWhatsAppMessage, disconnectWhatsApp, isSocketActive } from './whatsappEngine.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS origins via env var `ALLOWED_ORIGINS` (comma-separated).
// If not provided, allow all origins for ease of deployment. For production,
// set `ALLOWED_ORIGINS` to your Hostinger domain (e.g. https://example.com)
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '';
const allowedOrigins = allowedOriginsEnv.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser tools (no origin) such as curl/Postman
    if (!origin) return callback(null, true);
    // If no allowedOrigins configured, treat as permissive
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS not allowed by server'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); // Increased limit for Base64 Profile Images

// Enable active cron-style background scheduling
startCampaignScheduler();

// ==========================================
// 1. AUTHENTICATION & PROFILE ENDPOINTS
// ==========================================

app.post('/api/auth/register', (req, res) => {
  const { email, password, first_name, last_name, phone } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const db = readDb();
  if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "A user with this email already exists." });
  }

  const newUser = {
    id: `usr_${Date.now()}`,
    first_name: first_name || "",
    last_name: last_name || "",
    email: email.toLowerCase(),
    phone: phone || "",
    password_hash: hashPassword(password),
    date_of_birth: "",
    gender: "Other",
    profile_image: `https://api.dicebear.com/7.x/initials/svg?seed=${first_name || 'U'}`,
    tier: "free"
  };

  db.users.push(newUser);
  writeDb(db);
  addSystemLog("user_register", `New user registered: ${email}`);

  // Auto-login session creation
  const sessionToken = `sess_${generateToken().substring(0, 16)}`;
  db.sessions.push({
    id: sessionToken,
    user_id: newUser.id,
    status: "Disconnected",
    device_info: "Vite App User Session",
    connected_at: null
  });
  writeDb(db);

  res.status(201).json({ token: sessionToken, user: newUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const db = readDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user || user.password_hash !== hashPassword(password)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  // Create active API session
  const sessionToken = `sess_${generateToken().substring(0, 16)}`;
  db.sessions.push({
    id: sessionToken,
    user_id: user.id,
    status: "Disconnected",
    device_info: "Vite App User Session",
    connected_at: null
  });
  writeDb(db);
  addSystemLog("user_login", `User logged in: ${email}`);

  res.json({ token: sessionToken, user });
});

app.get('/api/auth/me', authenticateUser, (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json(user);
});

app.put('/api/auth/profile', authenticateUser, (req, res) => {
  const { first_name, last_name, phone, date_of_birth, gender, profile_image } = req.body;
  const db = readDb();
  const index = db.users.findIndex(u => u.id === req.userId);

  if (index === -1) return res.status(404).json({ error: "User not found." });

  db.users[index] = {
    ...db.users[index],
    first_name: first_name !== undefined ? first_name : db.users[index].first_name,
    last_name: last_name !== undefined ? last_name : db.users[index].last_name,
    phone: phone !== undefined ? phone : db.users[index].phone,
    date_of_birth: date_of_birth !== undefined ? date_of_birth : db.users[index].date_of_birth,
    gender: gender !== undefined ? gender : db.users[index].gender,
    profile_image: profile_image !== undefined ? profile_image : db.users[index].profile_image,
  };

  writeDb(db);
  addSystemLog("user_profile", `User profile updated for: ${db.users[index].email}`);
  res.json(db.users[index]);
});

app.put('/api/auth/tier', authenticateUser, (req, res) => {
  const { tier } = req.body;
  if (!['free', 'starter', 'professional', 'agency'].includes(tier)) {
    return res.status(400).json({ error: "Invalid billing tier." });
  }

  const db = readDb();
  const index = db.users.findIndex(u => u.id === req.userId);
  if (index === -1) return res.status(404).json({ error: "User not found." });

  db.users[index].tier = tier;
  writeDb(db);
  addSystemLog("user_billing", `User tier upgraded to: ${tier.toUpperCase()}`);
  res.json({ success: true, tier });
});

// ==========================================
// 2. WHATSAPP SESSION ENDPOINTS
// ==========================================

app.get('/api/session/status', authenticateUser, (req, res) => {
  const db = readDb();
  let session = db.sessions.find(s => s.user_id === req.userId);
  if (!session) {
    session = {
      id: `sess_${generateToken().substring(0, 16)}`,
      user_id: req.userId,
      status: "Disconnected",
      device_info: "Vite App User Session",
      connected_at: null
    };
    db.sessions.push(session);
    writeDb(db);
  }

  // CRITICAL FIX: Only trigger a background reconnect if the session was previously
  // Connected AND there is no active socket (e.g., server restart). Do NOT call
  // initWhatsApp on every poll for Connecting/Authenticating/Reconnecting states -
  // that creates race conditions and duplicate sockets that break auth.
  if (session.status === 'Connected' && !isSocketActive(req.userId)) {
    initWhatsApp(req.userId, false).catch(err => {
      console.error(`Failed to auto-restore connected session for user ${req.userId}:`, err);
    });
  }
  
  // Return the latest QR code if it's currently connecting
  const qrDataUrl = getLatestQR(req.userId);

  res.json({ ...session, qrDataUrl });
});

app.post('/api/session/initiate', authenticateUser, async (req, res) => {
  const db = readDb();
  const index = db.sessions.findIndex(s => s.user_id === req.userId);
  
  if (index !== -1) {
    db.sessions[index].status = "Connecting";
    db.sessions[index].connected_at = null;
  }
  writeDb(db);
  addSystemLog("session_initiate", "Initiated real WhatsApp Web Baileys connection.");
  
  // Kick off Baileys Socket Engine
  try {
    await initWhatsApp(req.userId, true);
  } catch (err) {
    console.error("Failed to init WhatsApp:", err);
  }

  res.json({ success: true, status: "Connecting" });
});

// Mock scan endpoint is kept just in case, but actual connected event comes from Baileys
app.post('/api/session/scan', authenticateUser, (req, res) => {
  res.json({ success: true, status: "Connected" }); // Baileys sets state directly
});

app.post('/api/session/disconnect', authenticateUser, async (req, res) => {
  const db = readDb();
  const index = db.sessions.findIndex(s => s.user_id === req.userId);
  
  if (index !== -1) {
    db.sessions[index].status = "Disconnected";
    db.sessions[index].connected_at = null;
  }
  writeDb(db);
  addSystemLog("session_disconnected", "WhatsApp session closed by user.");

  await disconnectWhatsApp(req.userId);

  res.json({ success: true, status: "Disconnected" });
});

// ==========================================
// 3. CRM & CONTACTS ENDPOINTS
// ==========================================

app.get('/api/contacts', authenticateUser, (req, res) => {
  const db = readDb();
  const userContacts = db.contacts.filter(c => c.user_id === req.userId);
  res.json(userContacts);
});

app.post('/api/contacts', authenticateUser, (req, res) => {
  const { name, phone_number, tags, stage, notes } = req.body;
  if (!name || !phone_number) {
    return res.status(400).json({ error: "Name and Phone Number are required." });
  }

  const db = readDb();
  
  // Plan limits check
  const user = db.users.find(u => u.id === req.userId);
  const contactCount = db.contacts.filter(c => c.user_id === req.userId).length;
  if (user && user.tier === 'free' && contactCount >= 5) {
    return res.status(403).json({ error: "Plan Limit Reached! Free plan is limited to 5 contacts. Please upgrade." });
  }

  const newContact = {
    id: `con_${Date.now()}`,
    user_id: req.userId,
    name,
    phone_number,
    tags: tags || [],
    stage: stage || "New Lead",
    notes: notes || "",
    messages: []
  };

  db.contacts.push(newContact);
  writeDb(db);
  addSystemLog("contact_create", `Created contact "${name}" (${phone_number})`);
  res.status(201).json(newContact);
});

app.post('/api/contacts/bulk-import', authenticateUser, (req, res) => {
  const { contactsList, stage, tags } = req.body;
  if (!contactsList) {
    return res.status(400).json({ error: "Contacts list is required." });
  }

  const db = readDb();
  
  // Plan limits check
  const user = db.users.find(u => u.id === req.userId);
  const currentCount = db.contacts.filter(c => c.user_id === req.userId).length;

  const lines = contactsList.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const parsedContacts = [];

  for (const line of lines) {
    let name = '';
    let phone = '';
    
    if (line.includes(',')) {
      const parts = line.split(',');
      name = parts[0].trim();
      phone = parts.slice(1).join(',').trim();
    } else {
      phone = line;
      name = `Imported Lead ${parsedContacts.length + 1}`;
    }

    // Clean phone number (keep digits and leading plus)
    const cleanedPhone = phone.replace(/[^\d+]/g, '');
    if (cleanedPhone) {
      parsedContacts.push({ name, phone_number: cleanedPhone });
    }
  }

  if (parsedContacts.length === 0) {
    return res.status(400).json({ error: "No valid contacts found in input." });
  }

  // Check plan limit
  if (user && user.tier === 'free' && currentCount + parsedContacts.length > 5) {
    return res.status(403).json({ error: "Plan Limit Reached! Free plan is limited to 5 contacts. Please upgrade." });
  }

  const newContacts = parsedContacts.map((c, index) => ({
    id: `con_${Date.now()}_${index}`,
    user_id: req.userId,
    name: c.name,
    phone_number: c.phone_number,
    tags: tags || ['Bulk Import'],
    stage: stage || "New Lead",
    notes: "Bulk imported",
    messages: []
  }));

  db.contacts.push(...newContacts);
  writeDb(db);
  addSystemLog("contact_bulk_import", `Bulk imported ${newContacts.length} contacts.`);

  res.status(201).json({ success: true, count: newContacts.length });
});

app.put('/api/contacts/:id', authenticateUser, (req, res) => {
  const { name, phone_number, tags, stage, notes } = req.body;
  const db = readDb();
  const index = db.contacts.findIndex(c => c.id === req.params.id && c.user_id === req.userId);

  if (index === -1) return res.status(404).json({ error: "Contact not found." });

  db.contacts[index] = {
    ...db.contacts[index],
    name: name !== undefined ? name : db.contacts[index].name,
    phone_number: phone_number !== undefined ? phone_number : db.contacts[index].phone_number,
    tags: tags !== undefined ? tags : db.contacts[index].tags,
    stage: stage !== undefined ? stage : db.contacts[index].stage,
    notes: notes !== undefined ? notes : db.contacts[index].notes,
  };

  writeDb(db);
  addSystemLog("contact_update", `Updated contact "${db.contacts[index].name}"`);
  res.json(db.contacts[index]);
});

app.delete('/api/contacts/:id', authenticateUser, (req, res) => {
  const db = readDb();
  const contact = db.contacts.find(c => c.id === req.params.id && c.user_id === req.userId);
  
  if (!contact) return res.status(404).json({ error: "Contact not found." });

  db.contacts = db.contacts.filter(c => c.id !== req.params.id);
  writeDb(db);
  addSystemLog("contact_delete", `Deleted contact "${contact.name}"`);
  res.json({ success: true });
});

// ==========================================
// 4. MESSAGING SYSTEM ENDPOINTS
// ==========================================

app.get('/api/contacts/:id/messages', authenticateUser, (req, res) => {
  const db = readDb();
  const contact = db.contacts.find(c => c.id === req.params.id && c.user_id === req.userId);
  if (!contact) return res.status(404).json({ error: "Contact not found." });
  res.json(contact.messages || []);
});

// Send an outgoing agent message
app.post('/api/contacts/:id/messages', authenticateUser, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Message content is required." });

  const db = readDb();
  
  const contactIndex = db.contacts.findIndex(c => c.id === req.params.id && c.user_id === req.userId);
  if (contactIndex === -1) return res.status(404).json({ error: "Contact not found." });

  const freshContact = db.contacts[contactIndex];
  const session = db.sessions.find(s => s.user_id === req.userId);
  const isConnected = session && session.status === "Connected";

  // 1. Send via real WhatsApp Baileys engine if connected
  if (isConnected) {
    try {
      await sendWhatsAppMessage(req.userId, freshContact.phone_number, content);
    } catch (err) {
      console.error("Failed to send real WhatsApp message:", err);
      return res.status(500).json({ error: "Failed to send message via WhatsApp." });
    }
  } else {
    console.log(`WhatsApp disconnected for user ${req.userId}. Storing simulated message (Sandbox mode).`);
  }

  // 2. Persist to DB
  const newMsg = {
    id: `msg_agent_${Date.now()}`,
    sender: "agent",
    content,
    timestamp: new Date().toISOString()
  };

  freshContact.messages.push(newMsg);
  
  // Update stage to contacted if it was New Lead
  if (freshContact.stage === "New Lead") {
    freshContact.stage = "Contacted";
  }

  db.contacts[contactIndex] = freshContact;
  writeDb(db);

  if (isConnected) {
    addSystemLog("message_sent", `Sent real message to ${freshContact.name}: "${content}"`);
  } else {
    addSystemLog("message_sent", `[Sandbox] Sent simulated message to ${freshContact.name}: "${content}"`);
  }

  res.json(newMsg);
});

// Simulate receiving an incoming message from a customer (Triggers keyword automation engine)
app.post('/api/contacts/:id/simulate-incoming', authenticateUser, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Message content is required." });

  try {
    const autoReply = await processIncomingMessage(req.userId, req.params.id, content);
    res.json({ success: true, auto_reply: autoReply });
  } catch (err) {
    res.status(500).json({ error: "Failed to process simulated incoming message." });
  }
});

// ==========================================
// 5. CAMPAIGN MANAGEMENT MODULE
// ==========================================

app.get('/api/campaigns', authenticateUser, (req, res) => {
  const db = readDb();
  const userCampaigns = db.campaigns.filter(c => c.user_id === req.userId);
  res.json(userCampaigns);
});

app.post('/api/campaigns', authenticateUser, (req, res) => {
  const { title, message_content, schedule_time, target_tags } = req.body;
  if (!title || !message_content) {
    return res.status(400).json({ error: "Title and message content are required." });
  }

  const db = readDb();
  
  // Plan limits check
  const user = db.users.find(u => u.id === req.userId);
  const campaignCount = db.campaigns.filter(c => c.user_id === req.userId).length;
  if (user && user.tier === 'free' && campaignCount >= 1) {
    return res.status(403).json({ error: "Plan Limit Reached! Free plan is limited to 1 campaign. Upgrade now." });
  }

  // Count target contacts based on tags
  const matchedContacts = target_tags && target_tags.length > 0
    ? db.contacts.filter(c => c.user_id === req.userId && c.tags.some(t => target_tags.includes(t)))
    : db.contacts.filter(c => c.user_id === req.userId);

  const schedTime = schedule_time ? new Date(schedule_time).toISOString() : new Date().toISOString();

  const newCampaign = {
    id: `camp_${Date.now()}`,
    user_id: req.userId,
    title,
    message_content,
    schedule_time: schedTime,
    status: "Scheduled",
    sent_count: 0,
    total_count: matchedContacts.length
  };

  db.campaigns.push(newCampaign);
  writeDb(db);
  addSystemLog("campaign_create", `Scheduled campaign "${title}" for ${new Date(schedTime).toLocaleString()}`);
  res.status(201).json(newCampaign);
});

app.post('/api/campaigns/:id/cancel', authenticateUser, (req, res) => {
  const db = readDb();
  const index = db.campaigns.findIndex(c => c.id === req.params.id && c.user_id === req.userId);
  if (index === -1) return res.status(404).json({ error: "Campaign not found." });

  if (db.campaigns[index].status === "Scheduled") {
    db.campaigns[index].status = "Cancelled";
    writeDb(db);
    addSystemLog("campaign_cancel", `Cancelled campaign: "${db.campaigns[index].title}"`);
    return res.json(db.campaigns[index]);
  }
  
  res.status(400).json({ error: "Only scheduled campaigns can be cancelled." });
});

// ==========================================
// 6. AUTOMATION RULES ENDPOINTS
// ==========================================

app.get('/api/automation/rules', authenticateUser, (req, res) => {
  const db = readDb();
  const userRules = db.automation_rules.filter(r => r.user_id === req.userId);
  res.json(userRules);
});

app.post('/api/automation/rules', authenticateUser, (req, res) => {
  const { keyword, reply_content, update_stage, add_tag } = req.body;
  if (!keyword || !reply_content) {
    return res.status(400).json({ error: "Keyword and reply content are required." });
  }

  const db = readDb();
  
  // Limit to max 5 automation rules on starter plan or limits
  const user = db.users.find(u => u.id === req.userId);
  const ruleCount = db.automation_rules.filter(r => r.user_id === req.userId).length;
  if (user && user.tier === 'free' && ruleCount >= 2) {
    return res.status(403).json({ error: "Plan Limit Reached! Free plan is limited to 2 rules." });
  }

  const newRule = {
    id: `rule_${Date.now()}`,
    user_id: req.userId,
    keyword,
    reply_content,
    update_stage: update_stage || "",
    add_tag: add_tag || ""
  };

  db.automation_rules.push(newRule);
  writeDb(db);
  addSystemLog("rule_create", `Created automation rule for keyword "${keyword}"`);
  res.status(201).json(newRule);
});

app.delete('/api/automation/rules/:id', authenticateUser, (req, res) => {
  const db = readDb();
  const rule = db.automation_rules.find(r => r.id === req.params.id && r.user_id === req.userId);
  if (!rule) return res.status(404).json({ error: "Rule not found." });

  db.automation_rules = db.automation_rules.filter(r => r.id !== req.params.id);
  writeDb(db);
  addSystemLog("rule_delete", `Deleted automation rule for keyword "${rule.keyword}"`);
  res.json({ success: true });
});

// ==========================================
// 7. SYSTEM LOGS & ANALYTICS
// ==========================================

app.get('/api/logs', authenticateUser, (req, res) => {
  const db = readDb();
  // Filter logs or return latest logs
  res.json(db.logs || []);
});

app.get('/api/analytics', authenticateUser, (req, res) => {
  const db = readDb();
  
  const userContacts = db.contacts.filter(c => c.user_id === req.userId);
  const userCampaigns = db.campaigns.filter(c => c.user_id === req.userId);
  const userRules = db.automation_rules.filter(r => r.user_id === req.userId);

  // Compute pipeline stage distribution
  const stagesCount = {
    "New Lead": 0,
    "Interested": 0,
    "Follow Up": 0,
    "Convertible": 0,
    "Converted": 0,
    "Lost": 0
  };
  userContacts.forEach(c => {
    if (stagesCount[c.stage] !== undefined) {
      stagesCount[c.stage] += 1;
    }
  });

  // Calculate message exchanges
  let sentCount = 0;
  let receivedCount = 0;
  userContacts.forEach(c => {
    if (c.messages) {
      c.messages.forEach(m => {
        if (m.sender === 'agent') sentCount++;
        else if (m.sender === 'customer') receivedCount++;
      });
    }
  });

  // Compute standard metrics
  const totalCampaigns = userCampaigns.length;
  const completedCampaigns = userCampaigns.filter(c => c.status === "Completed").length;
  const totalDeliveredCampaignMsgs = userCampaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);

  res.json({
    kpis: {
      total_contacts: userContacts.length,
      total_campaigns: totalCampaigns,
      messages_sent: sentCount,
      messages_received: receivedCount,
      active_rules: userRules.length,
      conversion_rate: userContacts.length > 0 
        ? Math.round((stagesCount["Converted"] / userContacts.length) * 100) 
        : 0
    },
    pipeline: stagesCount,
    campaign_volume: totalDeliveredCampaignMsgs,
    message_stats: {
      sent: sentCount,
      received: receivedCount
    }
  });
});

// ==========================================
// 8. PRODUCTION STATIC FILE SERVING
// ==========================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  addSystemLog("server_start", `Backend Express engine started on port ${PORT}`);

  // Auto-initialize previously CONNECTED sessions at server startup.
  // IMPORTANT: Do NOT try to restore sessions stuck in Connecting/Authenticating/Reconnecting -
  // those are transient states that indicate an incomplete previous session. Reset them to
  // Disconnected so the user can start fresh.
  const autoInitSessions = async () => {
    try {
      const db = readDb();
      let dbChanged = false;
      for (const session of db.sessions) {
        if (session.status === 'Connected') {
          console.log(`[Startup] Restoring WhatsApp session for user ${session.user_id}...`);
          await initWhatsApp(session.user_id, false).catch(err => {
            console.error(`[Startup] Failed to restore session for user ${session.user_id}:`, err);
          });
        } else if (['Connecting', 'Authenticating', 'Reconnecting'].includes(session.status)) {
          // Reset stale transient states - these were interrupted mid-flow
          console.log(`[Startup] Resetting stale session state '${session.status}' -> 'Disconnected' for user ${session.user_id}`);
          session.status = 'Disconnected';
          dbChanged = true;
        }
      }
      if (dbChanged) writeDb(db);
    } catch (err) {
      console.error('[Startup] Failed to restore sessions:', err);
    }
  };
  autoInitSessions();
});
