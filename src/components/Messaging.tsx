import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, Search, ShieldCheck, AlertCircle, Smile } from 'lucide-react';
import type { Contact, Message, WhatsAppSession } from '../types';

interface MessagingProps {
  session: WhatsAppSession | null;
}

export const Messaging: React.FC<MessagingProps> = ({ session }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [crmInput, setCrmInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Manual Chat Form States
  const [showNewChatForm, setShowNewChatForm] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatError, setNewChatError] = useState('');

  const crmChatEndRef = useRef<HTMLDivElement>(null);
  const phoneChatEndRef = useRef<HTMLDivElement>(null);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
        if (data.length > 0 && !selectedContact) {
          setSelectedContact(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load contacts for messaging:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewChatError('');
    if (!newChatName.trim() || !newChatPhone.trim()) {
      setNewChatError('Name and Phone are required.');
      return;
    }

    try {
      const existing = contacts.find(c => c.phone_number === newChatPhone.trim());
      if (existing) {
        setSelectedContact(existing);
        setMessages(existing.messages || []);
        setShowNewChatForm(false);
        setNewChatName('');
        setNewChatPhone('');
        return;
      }

      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: newChatName.trim(),
          phone_number: newChatPhone.trim(),
          stage: 'New Lead',
          tags: ['Manual Chat'],
          notes: 'Started manually from chatbox'
        })
      });

      const data = await res.json();
      if (res.ok) {
        const updatedRes = await fetch('/api/contacts', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (updatedRes.ok) {
          const updatedContacts = await updatedRes.json();
          setContacts(updatedContacts);
          const newContact = updatedContacts.find((c: any) => c.phone_number === newChatPhone.trim());
          if (newContact) {
            setSelectedContact(newContact);
            setMessages([]);
          }
        }
        setShowNewChatForm(false);
        setNewChatName('');
        setNewChatPhone('');
      } else {
        setNewChatError(data.error || 'Failed to start chat.');
      }
    } catch (err) {
      setNewChatError('Server error.');
    }
  };

  useEffect(() => {
    fetchContacts();
    
    // Fast polling (every 1 second) for real-time synchronization between CRM actions, Scheduled campaigns, and the Phone sandbox!
    const timer = setInterval(() => {
      syncMessages();
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedContact]);

  // Synchronize messages for currently selected contact
  const syncMessages = async () => {
    if (!selectedContact) return;
    try {
      const res = await fetch(`/api/contacts/${selectedContact.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        
        // Only update state if message length changed to prevent flickering
        if (data.length !== messages.length) {
          setMessages(data);
        }
      }
    } catch (err) {
      console.error("Failed to sync chat history:", err);
    }
  };

  // Scroll to bottom helper
  useEffect(() => {
    crmChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    phoneChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send outgoing agent message (from dashboard)
  const handleSendFromCRM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crmInput.trim() || !selectedContact) return;

    setSyncing(true);
    const tempInput = crmInput;
    setCrmInput('');

    // Optimistic UI Update
    const tempAgentMsg: Message = {
      id: `temp_agent_${Date.now()}`,
      sender: 'agent',
      content: tempInput,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempAgentMsg]);

    try {
      const res = await fetch(`/api/contacts/${selectedContact.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content: tempInput })
      });
      
      if (res.ok) {
        // Replace temp message with real one from backend
        const newMsg = await res.json();
        setMessages(prev => prev.map(m => m.id === tempAgentMsg.id ? newMsg : m));
        // Sync contacts to pull updated pipeline stages
        fetchContacts();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to send message.');
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== tempAgentMsg.id));
        setCrmInput(tempInput); // Restore input
      }
    } catch (err) {
      alert('Error sending message. Check that backend is running.');
      setMessages(prev => prev.filter(m => m.id !== tempAgentMsg.id));
      setCrmInput(tempInput); // Restore input
    } finally {
      setSyncing(false);
    }
  };

  // Send incoming simulated message (from phone sandbox as the customer)
  const handleSendFromPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim() || !selectedContact) return;

    const tempInput = phoneInput;
    setPhoneInput('');

    try {
      // 1. Instantly append customer message in the state for instant response feel
      const tempCustomerMsg: Message = {
        id: `temp_${Date.now()}`,
        sender: 'customer',
        content: tempInput,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempCustomerMsg]);

      // 2. Post to backend
      const res = await fetch(`/api/contacts/${selectedContact.id}/simulate-incoming`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content: tempInput })
      });
      
      if (res.ok) {
        const data = await res.json();
        // 3. Instantly append the auto reply without doing another GET request!
        if (data.auto_reply) {
          setMessages(prev => [...prev, data.auto_reply]);
        }
        fetchContacts(); // Reload CRM metadata in background
      }
    } catch (err) {
      console.error("Failed to simulate incoming message:", err);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone_number.includes(searchQuery)
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flex: 1 }}>
        <div className="preloader-spinner" style={{ borderColor: 'rgba(47, 160, 132, 0.1)', borderLeftColor: 'var(--primary-green)' }}></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', height: '100vh', overflow: 'hidden' }}>
      
      {/* Tab Header info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', letterSpacing: '-0.5px', margin: 0 }}>Chats & Sandbox Simulator</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Manage manual client responses and run rule-based triggers in the embedded customer smartphone container.
          </p>
        </div>
      </div>

      {session?.status !== 'Connected' && (
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          color: '#d97706',
          padding: '12px 16px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={18} />
          <span>
            <strong>Attention:</strong> Your WhatsApp Web session is currently offline. You cannot send manual CRM replies until you connect. Scan QR inside the <strong>WhatsApp Connection</strong> tab.
          </span>
        </div>
      )}

      {/* Main split dashboard layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr 340px', gap: '20px', overflow: 'hidden' }}>
        
        {/* LEFT COLUMN: Contacts selector list */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflow: 'hidden' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search chat..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ width: '100%', paddingLeft: '32px', fontSize: '0.8rem' }}
            />
          </div>

          {/* Start New Chat Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!showNewChatForm ? (
              <button
                onClick={() => setShowNewChatForm(true)}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <span>➕ Start New Chat</span>
              </button>
            ) : (
              <form onSubmit={handleCreateNewChat} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.01)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem' }}
                  required
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem' }}
                  required
                />
                {newChatError && <span style={{ fontSize: '0.65rem', color: '#f87171' }}>{newChatError}</span>}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '3px', fontSize: '0.7rem' }}>Start</button>
                  <button type="button" onClick={() => setShowNewChatForm(false)} className="btn btn-secondary" style={{ flex: 1, padding: '3px', fontSize: '0.7rem' }}>Cancel</button>
                </div>
              </form>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredContacts.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>
                No active contacts found.
              </p>
            ) : (
              filteredContacts.map(contact => {
                const isSelected = selectedContact?.id === contact.id;
                const lastMsg = contact.messages && contact.messages.length > 0 
                  ? contact.messages[contact.messages.length - 1]
                  : null;

                return (
                  <button
                    key={contact.id}
                    onClick={() => {
                      setSelectedContact(contact);
                      setMessages(contact.messages || []);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isSelected ? 'rgba(47, 160, 132, 0.1)' : 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(47, 160, 132, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      color: 'var(--dark-accent)',
                      fontSize: '0.9rem'
                    }}>
                      {contact.name.charAt(0)}
                    </div>
                    
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {contact.name}
                        </span>
                      </div>
                      <p style={{ 
                        fontSize: '0.7rem', 
                        color: 'var(--text-muted)', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        marginTop: '2px'
                      }}>
                        {lastMsg ? lastMsg.content : 'No messages exchange'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* MIDDLE COLUMN: SaaS Agent Chat Console */}
        <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          
          {selectedContact ? (
            <>
              {/* Active Chat Header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.01)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(47, 160, 132, 0.15)',
                    color: 'var(--dark-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}>
                    {selectedContact.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{selectedContact.name}</h3>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '2px', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#3b82f6',
                        fontWeight: 600
                      }}>
                        {selectedContact.stage}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedContact.phone_number}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedContact.tags.map(t => (
                    <span key={t} className="tag-badge">{t}</span>
                  ))}
                </div>
              </div>

              {/* Chat Messages viewport */}
              <div style={{
                flex: 1,
                padding: '20px',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-app)',
                backgroundImage: 'radial-gradient(var(--border-light) 0.5px, transparent 0.5px)',
                backgroundSize: '16px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {messages.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 'auto', gap: '10px' }}>
                    <ShieldCheck size={32} style={{ color: 'var(--primary-green)' }} />
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Secure end-to-end sandbox chat logs</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isAgent = msg.sender === 'agent';
                    
                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: isAgent ? 'flex-end' : 'flex-start',
                          backgroundColor: isAgent ? 'var(--primary-green)' : 'var(--light-card)',
                          color: isAgent ? 'white' : 'var(--text-main)',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          borderTopRightRadius: isAgent ? '2px' : '12px',
                          borderTopLeftRadius: isAgent ? '12px' : '2px',
                          maxWidth: '75%',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          border: isAgent ? 'none' : '1px solid var(--border-light)',
                          animation: 'bubblePop 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <p style={{ fontSize: '0.85rem', margin: 0, whiteSpace: 'pre-line' }}>{msg.content}</p>
                        <span style={{
                          display: 'block',
                          fontSize: '0.6rem',
                          textAlign: 'right',
                          marginTop: '4px',
                          opacity: 0.7,
                          color: isAgent ? 'white' : 'var(--text-muted)'
                        }}>
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'just now'}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={crmChatEndRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendFromCRM} style={{ padding: '16px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder={session?.status === 'Connected' ? "Type a CRM WhatsApp reply..." : "Type a simulated reply (WhatsApp Offline)..."}
                  value={crmInput}
                  onChange={(e) => setCrmInput(e.target.value)}
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={!crmInput.trim() || syncing}
                  className="btn btn-primary"
                  style={{ padding: '10px' }}
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <AlertCircle size={32} />
              <p style={{ marginTop: '10px' }}>Create a contact in CRM to activate chat console.</p>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Real-Time Glowing Phone Sandbox Widget */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          
          <div className="smartphone-sandbox" style={{
            boxShadow: 'var(--shadow-glow), 0 20px 40px rgba(0,0,0,0.15)'
          }}>
            
            {/* Phone Header */}
            <div className="phone-header">
              <div className="phone-avatar">
                {selectedContact ? selectedContact.name.charAt(0) : 'U'}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedContact ? selectedContact.name : 'Unknown User'}
                </p>
                <span className="phone-status">Online (Customer POV)</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', opacity: 0.8 }}>
                <Phone size={14} />
                <Video size={14} />
              </div>
            </div>

            {/* Phone Screen body */}
            <div className="phone-body">
              <div style={{
                margin: '0 auto 8px',
                padding: '4px 10px',
                borderRadius: '8px',
                background: 'rgba(30, 36, 40, 0.85)',
                color: '#8596a0',
                fontSize: '0.65rem',
                textAlign: 'center',
                maxWidth: '90%',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                🔒 Messages and calls are end-to-end encrypted. No real phone scans required.
              </div>

              {messages.map(msg => {
                const isCustomer = msg.sender === 'customer';
                
                return (
                  <div
                    key={msg.id}
                    className={`chat-bubble ${isCustomer ? 'bubble-customer' : 'bubble-agent'}`}
                  >
                    {msg.content}
                    <span className="bubble-time">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
                    </span>
                  </div>
                );
              })}
              <div ref={phoneChatEndRef} />
            </div>

            {/* Phone Footer inputs */}
            <form onSubmit={handleSendFromPhone} className="phone-footer">
              <Smile size={18} style={{ color: '#8596a0', cursor: 'pointer' }} />
              <input
                type="text"
                placeholder={selectedContact ? "Simulate customer reply..." : "Select a contact..."}
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                disabled={!selectedContact}
                className="phone-input"
              />
              <button
                type="submit"
                disabled={!phoneInput.trim() || !selectedContact}
                className="phone-send"
              >
                <Send size={12} fill="white" />
              </button>
            </form>

          </div>

          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: 'rgba(47, 160, 132, 0.05)',
            border: '1px solid rgba(47, 160, 132, 0.15)',
            borderRadius: '8px',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            maxWidth: '320px'
          }}>
            💡 <strong>Sandbox Hack:</strong> Send the keyword <code>price</code> or <code>demo</code> from the customer phone to test the automated CRM triggers and pipeline updates instantly!
          </div>

        </div>

      </div>
    </div>
  );
};
