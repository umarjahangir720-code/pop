import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(__dirname, 'data.json');

// Default initial database state
const defaultDb = {
  users: [
    {
      id: "usr_demo",
      first_name: "John",
      last_name: "Doe",
      email: "demo@prowp.com",
      phone: "+1234567890",
      // Plain text check for demo ease or simple comparison, we'll implement simple hashing
      password_hash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", // SHA256 of "password"
      date_of_birth: "1992-05-18",
      gender: "Male",
      profile_image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
      tier: "starter"
    }
  ],
  sessions: [
    {
      id: "sess_demo",
      user_id: "usr_demo",
      status: "Disconnected",
      device_info: "WhatsApp Web Chrome on Windows",
      connected_at: null
    }
  ],
  contacts: [
    {
      id: "con_1",
      user_id: "usr_demo",
      name: "Jane Smith",
      phone_number: "+1987654321",
      tags: ["VIP", "Interested"],
      stage: "Interested",
      notes: "Met at trade show. Highly interested in our marketing campaign tool.",
      messages: [
        { id: "msg_init_1", sender: "customer", content: "Hi! I wanted to check your platform features.", timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
        { id: "msg_init_2", sender: "agent", content: "Hi Jane! We support automated broadcasts and deep CRM pipelines.", timestamp: new Date(Date.now() - 3600000 * 1.9).toISOString() }
      ]
    },
    {
      id: "con_2",
      user_id: "usr_demo",
      name: "Alex Rivera",
      phone_number: "+14155552671",
      tags: ["Prospect"],
      stage: "New Lead",
      notes: "Filled out form on website.",
      messages: []
    },
    {
      id: "con_3",
      user_id: "usr_demo",
      name: "Sarah Connor",
      phone_number: "+13125559821",
      tags: ["Customer"],
      stage: "Converted",
      notes: "Onboarded successfully.",
      messages: [
        { id: "msg_init_3", sender: "agent", content: "Welcome aboard! Let us know if you need setup help.", timestamp: new Date(Date.now() - 86400000).toISOString() }
      ]
    }
  ],
  campaigns: [
    {
      id: "camp_demo_1",
      user_id: "usr_demo",
      title: "Welcome Warmup Sequence",
      message_content: "Hey {{name}}! Welcome to proWP. Text 'demo' to schedule a call.",
      schedule_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      status: "Scheduled",
      sent_count: 0,
      total_count: 3
    }
  ],
  automation_rules: [
    {
      id: "rule_1",
      user_id: "usr_demo",
      keyword: "price",
      reply_content: "Hi! Our plans start at $19/mo for Starter and $49/mo for Pro. Text 'demo' to learn more!",
      update_stage: "Follow Up",
      add_tag: "Price Inquiry"
    },
    {
      id: "rule_2",
      user_id: "usr_demo",
      keyword: "demo",
      reply_content: "Sure! Click this link to book a 1-on-1 demo session: https://calendly.com/prowp-demo",
      update_stage: "Interested",
      add_tag: "Demo Scheduled"
    }
  ],
  logs: [
    { id: "log_1", timestamp: new Date().toISOString(), type: "system", message: "Database initialized successfully" }
  ]
};

// Initialize database file if it doesn't exist
if (!fs.existsSync(dbFilePath)) {
  fs.writeFileSync(dbFilePath, JSON.stringify(defaultDb, null, 2), 'utf8');
}

export function readDb() {
  try {
    const data = fs.readFileSync(dbFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database:", err);
    return defaultDb;
  }
}

export function writeDb(data) {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error("Error writing database:", err);
    return false;
  }
}

// Helper to log system events
export function addSystemLog(type, message) {
  const db = readDb();
  const newLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    type,
    message
  };
  db.logs = [newLog, ...(db.logs || [])].slice(0, 100); // Limit to latest 100 logs
  writeDb(db);
}
