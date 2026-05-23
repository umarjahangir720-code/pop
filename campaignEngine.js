import { readDb, writeDb, addSystemLog } from './db.js';
import { sendWhatsAppMessage } from './whatsappEngine.js';

/**
 * Periodically checks for pending campaigns and processes them.
 */
export function checkAndRunCampaigns() {
  const db = readDb();
  const now = new Date();
  
  // Find scheduled campaigns that are due to execute
  const pendingCampaigns = db.campaigns.filter(c => 
    c.status === "Scheduled" && new Date(c.schedule_time) <= now
  );

  if (pendingCampaigns.length === 0) return;

  pendingCampaigns.forEach(campaign => {
    addSystemLog("campaign_start", `Executing scheduled campaign: "${campaign.title}"`);
    
    // Set status to Sending
    campaign.status = "Sending";
    campaign.sent_count = 0;
    campaign.processed_count = 0;
    db.campaigns = db.campaigns.map(c => c.id === campaign.id ? campaign : c);
    writeDb(db);

    // Fetch matching contacts for this user based on tags
    const targetTags = campaign.target_tags || [];
    const matchedContacts = targetTags.length > 0
      ? db.contacts.filter(c => c.user_id === campaign.user_id && c.tags.some(t => targetTags.includes(t)))
      : db.contacts.filter(c => c.user_id === campaign.user_id);
    
    if (matchedContacts.length === 0) {
      campaign.status = "Completed";
      campaign.sent_count = 0;
      campaign.total_count = 0;
      addSystemLog("campaign_empty", `Campaign "${campaign.title}" completed with 0 matching contacts.`);
      db.campaigns = db.campaigns.map(c => c.id === campaign.id ? campaign : c);
      writeDb(db);
      return;
    }

    // Update the total count to match exactly the matched contacts length
    campaign.total_count = matchedContacts.length;
    db.campaigns = db.campaigns.map(c => c.id === campaign.id ? campaign : c);
    writeDb(db);
    
    // Dispatch messages with a slight delay per contact for safety
    matchedContacts.forEach((contact, idx) => {
      setTimeout(async () => {
        const freshDb = readDb();
        const freshContactIndex = freshDb.contacts.findIndex(c => c.id === contact.id);
        
        if (freshContactIndex !== -1) {
          const freshContact = freshDb.contacts[freshContactIndex];
          const messageContent = campaign.message_content.replace('{{name}}', freshContact.name);
          
          let sendSuccess = false;
          try {
            // Attempt true transmission via active WhatsApp socket
            await sendWhatsAppMessage(campaign.user_id, freshContact.phone_number, messageContent);
            sendSuccess = true;
          } catch (err) {
            console.error(`[Campaign] Failed to dispatch message to +${freshContact.phone_number}:`, err.message);
          }

          // Create campaign message record
          const campaignMessage = {
            id: `msg_camp_${campaign.id}_${Date.now()}_${idx}`,
            sender: "agent",
            content: messageContent,
            timestamp: new Date().toISOString(),
            campaign_id: campaign.id,
            status: sendSuccess ? "Delivered" : "Failed" // Track message-level state
          };
          
          freshContact.messages.push(campaignMessage);
          
          // Move stage to Contacted if they were in New Lead
          if (freshContact.stage === "New Lead") {
            freshContact.stage = "Interested"; // Move to Interested as next stage or contact pipeline
          }
          
          freshDb.contacts[freshContactIndex] = freshContact;
          
          // Update campaign metrics
          const freshCampaignIndex = freshDb.campaigns.findIndex(c => c.id === campaign.id);
          if (freshCampaignIndex !== -1) {
            const currentCampaign = freshDb.campaigns[freshCampaignIndex];
            
            if (sendSuccess) {
              currentCampaign.sent_count += 1;
            }
            
            currentCampaign.processed_count = (currentCampaign.processed_count || 0) + 1;
            
            // Mark completed or failed based on processing completion
            if (currentCampaign.processed_count >= matchedContacts.length) {
              const finalSent = currentCampaign.sent_count;
              if (finalSent === matchedContacts.length) {
                currentCampaign.status = "Completed";
              } else if (finalSent === 0) {
                currentCampaign.status = "Failed";
              } else {
                currentCampaign.status = "Completed"; // Partial transmission completed
              }
              addSystemLog("campaign_complete", `Campaign "${campaign.title}" successfully finished. Delivered: ${finalSent}/${matchedContacts.length}.`);
            }
            
            freshDb.campaigns[freshCampaignIndex] = currentCampaign;
          }
          
          writeDb(freshDb);
        }
      }, idx * 1000); // 1-second gap between broadcasts
    });
  });
}

// Start active campaign polling interval
let campaignInterval = null;
export function startCampaignScheduler() {
  if (campaignInterval) clearInterval(campaignInterval);
  
  // Poll every 5 seconds
  campaignInterval = setInterval(() => {
    try {
      checkAndRunCampaigns();
    } catch (err) {
      console.error("Error in campaign scheduler tick:", err);
    }
  }, 5000);
}
