import { readDb, writeDb, addSystemLog } from './db.js';

/**
 * Processes an incoming customer message, matches keywords, and returns an automated response
 * @param {string} userId - User ID who owns the session
 * @param {string} contactId - Contact ID sending the message
 * @param {string} messageText - Content of the incoming message
 * @returns {Promise<object|null>} - Returns the auto-reply message details, or null if no rule matches
 */
export async function processIncomingMessage(userId, contactId, messageText) {
  const db = readDb();
  
  // Find contact
  const contactIndex = db.contacts.findIndex(c => c.id === contactId && c.user_id === userId);
  if (contactIndex === -1) return null;
  const contact = db.contacts[contactIndex];

  // Append the incoming message to the contact's messages
  const incomingMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    sender: "customer",
    content: messageText,
    timestamp: new Date().toISOString()
  };
  contact.messages.push(incomingMessage);

  addSystemLog("incoming_message", `Received from ${contact.name} (${contact.phone_number}): "${messageText}"`);

  // Find matching keyword rule (case insensitive search)
  const normalizedText = messageText.toLowerCase().trim();
  const rules = db.automation_rules.filter(r => r.user_id === userId);
  
  let matchedRule = null;
  for (const rule of rules) {
    if (normalizedText.includes(rule.keyword.toLowerCase().trim())) {
      matchedRule = rule;
      break;
    }
  }

  let autoReplyMessage = null;

  if (matchedRule) {
    // We have a match! Let's execute rule outcomes
    addSystemLog("automation_trigger", `Rule matched for keyword "${matchedRule.keyword}". Triggering action.`);

    // 1. Prepare the reply content
    const replyText = matchedRule.reply_content.replace('{{name}}', contact.name);
    
    // 2. Append reply message to messages array
    autoReplyMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sender: "agent", // The SaaS system
      content: replyText,
      timestamp: new Date(Date.now() + 500).toISOString() // Slightly after incoming
    };
    contact.messages.push(autoReplyMessage);

    // 3. Update Pipeline Stage if rule requires
    if (matchedRule.update_stage) {
      const oldStage = contact.stage;
      contact.stage = matchedRule.update_stage;
      addSystemLog("crm_update", `Updated ${contact.name}'s stage from "${oldStage}" to "${matchedRule.update_stage}"`);
    }

    // 4. Add Tag if rule requires
    if (matchedRule.add_tag) {
      if (!contact.tags.includes(matchedRule.add_tag)) {
        contact.tags.push(matchedRule.add_tag);
        addSystemLog("crm_update", `Added tag "${matchedRule.add_tag}" to ${contact.name}`);
      }
    }

    // 5. Append a note regarding the automation trigger
    const autoNote = `[Automation] Triggered by incoming message containing "${matchedRule.keyword}" at ${new Date().toLocaleTimeString()}. Stage set to ${contact.stage}.`;
    contact.notes = contact.notes ? `${contact.notes}\n${autoNote}` : autoNote;
  }

  // Save changes
  db.contacts[contactIndex] = contact;
  writeDb(db);

  return autoReplyMessage;
}
