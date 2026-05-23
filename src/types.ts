export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  profile_image: string;
  tier: 'free' | 'starter' | 'professional' | 'agency';
}

export interface WhatsAppSession {
  id: string;
  user_id: string;
  status: 'Disconnected' | 'Connecting' | 'Authenticating' | 'Reconnecting' | 'Connected';
  device_info: string;
  connected_at: string | null;
}

export interface Message {
  id: string;
  sender: 'customer' | 'agent';
  content: string;
  timestamp: string;
  campaign_id?: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone_number: string;
  tags: string[];
  stage: 'New Lead' | 'Interested' | 'Follow Up' | 'Convertible' | 'Converted' | 'Lost';
  notes: string;
  messages: Message[];
}

export interface Campaign {
  id: string;
  user_id: string;
  title: string;
  message_content: string;
  schedule_time: string;
  status: 'Draft' | 'Scheduled' | 'Sending' | 'Completed' | 'Cancelled';
  sent_count: number;
  total_count: number;
}

export interface AutomationRule {
  id: string;
  user_id: string;
  keyword: string;
  reply_content: string;
  update_stage?: string;
  add_tag?: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  type: string;
  message: string;
}

export interface AnalyticsData {
  kpis: {
    total_contacts: number;
    total_campaigns: number;
    messages_sent: number;
    messages_received: number;
    active_rules: number;
    conversion_rate: number;
  };
  pipeline: {
    "New Lead": number;
    "Contacted": number;
    "Interested": number;
    "Converted": number;
    "Lost": number;
  };
  campaign_volume: number;
  message_stats: {
    sent: number;
    received: number;
  };
}
