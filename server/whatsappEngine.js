import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { readDb, writeDb, addSystemLog } from './db.js';
import { processIncomingMessage } from './automationEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store active socket instances by userId
const activeSockets = new Map();
// Store latest QR codes as base64 data URLs
const activeQRs = new Map();
// Guard against concurrent initWhatsApp calls for the same user
const pendingInits = new Set();

// Helper to update session state in our JSON DB
const updateDbSessionState = (userId, status) => {
  const db = readDb();
  let session = db.sessions.find(s => s.user_id === userId);
  if (!session) {
    session = { id: `sess_${Date.now()}`, user_id: userId };
    db.sessions.push(session);
  }
  
  session.status = status;
  if (status === 'Connected') {
    session.connected_at = new Date().toISOString();
  } else if (status === 'Disconnected') {
    session.connected_at = null;
  }
  
  writeDb(db);
};

export const getLatestQR = (userId) => {
  return activeQRs.get(userId) || null;
};

export const initWhatsApp = async (userId, forceFresh = false) => {
  // CRITICAL FIX 1: Prevent race conditions - block concurrent calls for same user
  if (pendingInits.has(userId)) {
    console.log(`[WhatsApp] Init already in progress for user ${userId}, skipping.`);
    return;
  }

  // If socket already exists and is active, skip re-initialization
  const existingSocket = activeSockets.get(userId);
  if (existingSocket) {
    if (!forceFresh) {
      console.log(`[WhatsApp] Socket already active for user ${userId}, skipping.`);
      return;
    } else {
      console.log(`[WhatsApp] Terminating existing socket for user ${userId} to start fresh...`);
      try {
        existingSocket.end(undefined);
      } catch (_) {}
      activeSockets.delete(userId);
      activeQRs.delete(userId);
    }
  }

  pendingInits.add(userId);

  try {
    const sessionDir = path.join(__dirname, 'sessions', `session_${userId}`);
    
    // CRITICAL FIX 2: Only wipe credentials when explicitly doing a fresh start from UI
    if (forceFresh) {
      if (fs.existsSync(sessionDir)) {
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
          console.log(`[WhatsApp] Cleared old session data for fresh start (user ${userId}).`);
        } catch (err) {
          console.error(`Failed to delete session directory: ${sessionDir}`, err);
        }
      }
    }
    
    // Ensure sessions directory exists
    if (!fs.existsSync(path.join(__dirname, 'sessions'))) {
      fs.mkdirSync(path.join(__dirname, 'sessions'), { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    // CRITICAL FIX 3: Use a hardcoded, known-good recent WhatsApp Web version.
    // fetchLatestBaileysVersion() fetches from GitHub which can fail or return a
    // version that WhatsApp temporarily rejects. A stable hardcoded version is more reliable.
    let version = [2, 3000, 1023142490];
    try {
      const latest = await fetchLatestBaileysVersion();
      if (latest && latest.version && Array.isArray(latest.version) && latest.version.length === 3) {
        version = latest.version;
        console.log(`[WhatsApp] Using fetched version: ${version.join('.')}`);
      }
    } catch (err) {
      console.log(`[WhatsApp] Using fallback version: ${version.join('.')}`);
    }

    // CRITICAL FIX 4: Use a plain array browser config instead of Browsers.macOS('Chrome').
    // The Browsers helper object can produce strings that WhatsApp flags. A raw modern
    // Chrome on Windows UA string is the most commonly accepted configuration.
    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'warn' }), // Show warnings but not noise
      browser: ['Windows', 'Chrome', '122.0.0.0'],
      syncFullHistory: false,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000,
      keepAliveIntervalMs: 30_000,
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 5,
      getMessage: async () => undefined, // Prevent message history fetching
    });

    activeSockets.set(userId, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      // Ignore updates from replaced/old sockets
      if (activeSockets.get(userId) !== sock) {
        console.log(`[WhatsApp] Ignoring connection update for old socket (user ${userId}).`);
        return;
      }
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // New QR code arrived - generate image and store it
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
          activeQRs.set(userId, qrDataUrl);
          updateDbSessionState(userId, 'Connecting');
          console.log(`[WhatsApp] New QR code generated for user ${userId}. Waiting for scan...`);
        } catch (err) {
          console.error('[WhatsApp] Failed to generate QR code data URL:', err);
        }
      }

      // Show authenticating overlay after QR is scanned (connecting event without a new QR)
      if (connection === 'connecting' && !qr && activeQRs.has(userId)) {
        updateDbSessionState(userId, 'Authenticating');
        console.log(`[WhatsApp] QR scanned by user ${userId}. Authenticating...`);
      }

      if (connection === 'close') {
        // Remove active socket and QR immediately
        activeQRs.delete(userId);
        activeSockets.delete(userId);

        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isRestartRequired = statusCode === DisconnectReason.restartRequired; // 515
        const isLogged = state.creds && state.creds.me;

        console.log(`[WhatsApp] Connection closed for user ${userId}. Status code: ${statusCode}. LoggedOut: ${isLoggedOut}. RestartRequired: ${isRestartRequired}. IsLogged: ${!!isLogged}`);

        const shouldCleanUp = isLoggedOut || 
                             statusCode === DisconnectReason.badSession || 
                             statusCode === DisconnectReason.multideviceMismatch ||
                             !isLogged;

        if (shouldCleanUp) {
          console.log(`[WhatsApp] Terminating session cleanly for user ${userId}. Cleaning up files.`);
          updateDbSessionState(userId, 'Disconnected');
          
          if (isLoggedOut) {
            addSystemLog('session_logged_out', 'WhatsApp session logged out by device.');
          } else if (statusCode === DisconnectReason.badSession) {
            addSystemLog('session_failed', 'WhatsApp session is invalid or bad credentials. Cleared.');
          } else if (!isLogged) {
            addSystemLog('session_failed', 'WhatsApp connection closed before authentication was completed.');
          }
          
          if (fs.existsSync(sessionDir)) {
            try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (_) {}
          }
        } else {
          // Reconnect silently
          console.log(`[WhatsApp] Scheduling reconnect for user ${userId} (code: ${statusCode})...`);
          
          if (!isRestartRequired) {
            updateDbSessionState(userId, 'Reconnecting');
            addSystemLog('session_reconnecting', 'WhatsApp session disconnected. Auto-reconnecting...');
          }

          // Wait 3 seconds then reconnect
          setTimeout(async () => {
            if (!activeSockets.has(userId)) {
              console.log(`[WhatsApp] Attempting auto-reconnect for user ${userId}...`);
              await initWhatsApp(userId, false).catch(err =>
                console.error('[WhatsApp] Failed to auto-reconnect:', err)
              );
            }
          }, 3000);
        }
      } else if (connection === 'open') {
        console.log(`[WhatsApp] ✅ Connection OPEN for user ${userId}. Session active!`);
        activeQRs.delete(userId); // QR no longer needed
        updateDbSessionState(userId, 'Connected');
        addSystemLog('session_connected', `WhatsApp Web session established for user ${userId}`);
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message) continue;
        if (msg.key.fromMe) continue; // Skip our own messages

        const senderJid = msg.key.remoteJid;
        if (!senderJid || (!senderJid.endsWith('@s.whatsapp.net') && !senderJid.endsWith('@lid'))) continue;

        // Extract message content (handle different message types)
        const content =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          msg.message.videoMessage?.caption ||
          null;

        if (!content) continue;

        const phoneNumber = senderJid.split('@')[0];

        const db = readDb();
        let contact = db.contacts.find(
          c => c.user_id === userId &&
          (c.phone_number === phoneNumber || c.phone_number === `+${phoneNumber}`)
        );
        
        if (!contact) {
          contact = {
            id: `con_${Date.now()}`,
            user_id: userId,
            name: `Unknown (${phoneNumber})`,
            phone_number: `+${phoneNumber}`,
            tags: ['Inbound'],
            stage: 'New Lead',
            notes: 'Auto-created from incoming message',
            messages: []
          };
          db.contacts.push(contact);
          addSystemLog('contact_auto_create', `Auto-created contact from incoming WhatsApp message: +${phoneNumber}`);
          writeDb(db);
        }

        const newMsg = {
          id: `msg_in_${Date.now()}_${msg.key.id}`,
          sender: 'customer',
          content,
          timestamp: new Date().toISOString()
        };
        
        const contactIndex = db.contacts.findIndex(c => c.id === contact.id);
        if (contactIndex !== -1) {
          db.contacts[contactIndex].messages.push(newMsg);
          writeDb(db);
        }

        console.log(`[WhatsApp] Incoming from +${phoneNumber}: ${content}`);

        // Process automation rules
        try {
          const autoReplyText = await processIncomingMessage(userId, contact.id, content);
          if (autoReplyText) {
            await sendWhatsAppMessage(userId, senderJid, autoReplyText.content);
          }
        } catch (err) {
          console.error('[WhatsApp] Failed to process automation rule:', err);
        }
      }
    });

  } finally {
    // Always remove from pending set when done (success or error)
    pendingInits.delete(userId);
  }
};

export const sendWhatsAppMessage = async (userId, jid, text) => {
  const sock = activeSockets.get(userId);
  if (!sock) {
    throw new Error('WhatsApp socket not connected for this user.');
  }

  let formattedJid = jid;
  if (!jid.includes('@')) {
    formattedJid = `${jid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
  }

  await sock.sendMessage(formattedJid, { text });
};

export const disconnectWhatsApp = async (userId) => {
  const sock = activeSockets.get(userId);
  if (sock) {
    try {
      await sock.logout();
    } catch (_) {
      // Ignore logout errors
    }
    activeSockets.delete(userId);
    activeQRs.delete(userId);
    updateDbSessionState(userId, 'Disconnected');
  }
};

// Export status check utility
export const isSocketActive = (userId) => activeSockets.has(userId);
