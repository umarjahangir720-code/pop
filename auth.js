import crypto from 'crypto';
import { readDb } from './db.js';

// Simple SHA-256 password hash helper
export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate secure random token
export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Simple authentication middleware
export function authenticateUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(' ')[1];
  const db = readDb();
  
  // For easy dev sessions, we match against active sessions or just validate
  const session = db.sessions.find(s => s.id === token);
  
  // If no session found in DB, fallback: check if it's the token "sess_demo"
  if (token === "sess_demo" || session) {
    req.userId = session ? session.user_id : "usr_demo";
    req.token = token;
    return next();
  }
  
  return res.status(401).json({ error: "Invalid token or session expired." });
}
