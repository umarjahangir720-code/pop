import React, { useState, useEffect } from 'react';
import { Megaphone, Calendar, Send, Ban, RefreshCw, PlusCircle, AlertCircle } from 'lucide-react';
import type { Campaign, Contact } from '../types';

interface CampaignsProps {
  // Empty or simple params
}

export const Campaigns: React.FC<CampaignsProps> = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [targetTag, setTargetTag] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error("Error loading campaigns:", err);
    }
  };

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
      }
    } catch (err) {
      console.error("Error loading contacts in campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchContacts();
    
    // Poll campaigns every 4 seconds to observe real-time sending progress bars animate!
    const timer = setInterval(() => {
      fetchCampaigns();
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Compute matched contacts count dynamically based on tag filter
  const getMatchedContactsCount = () => {
    if (!targetTag) return contacts.length;
    return contacts.filter(c => c.tags.includes(targetTag)).length;
  };

  // Get list of all unique tags available in contacts
  const getAvailableTags = () => {
    const tags = new Set<string>();
    contacts.forEach(c => c.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || !content.trim()) {
      setError('Campaign Title and message content template are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title,
        message_content: content,
        schedule_time: scheduleTime ? new Date(scheduleTime).toISOString() : new Date().toISOString(),
        target_tags: targetTag ? [targetTag] : []
      };

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Campaign scheduled and queued successfully!');
        setTitle('');
        setContent('');
        setScheduleTime('');
        setTargetTag('');
        fetchCampaigns();
      } else {
        setError(data.error || 'Failed to create campaign.');
      }
    } catch (err) {
      setError('Communication issue with Express scheduler engine.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelCampaign = async (id: string) => {
    setError('');
    try {
      const res = await fetch(`/api/campaigns/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        fetchCampaigns();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to cancel.');
      }
    } catch (err) {
      setError('Failed to cancel campaign.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flex: 1 }}>
        <div className="preloader-spinner" style={{ borderColor: 'rgba(47, 160, 132, 0.1)', borderLeftColor: 'var(--primary-green)' }}></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h1 style={{ fontSize: '2rem', letterSpacing: '-0.5px', margin: 0 }}>Campaign broadcasts Engine</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
          Execute customized bulk broadcasts, target segmented tags, and monitor delivery progress queues in real-time.
        </p>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: '#f87171',
          padding: '12px 16px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          fontSize: '0.9rem'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          color: '#34d399',
          padding: '12px 16px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          fontSize: '0.9rem'
        }}>
          <AlertCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr', gap: '30px' }}>
        
        {/* LEFT COLUMN: Campaign creation form */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={18} style={{ color: 'var(--primary-green)' }} />
            <span>Create Bulk Broadcast</span>
          </h3>

          <form onSubmit={handleCreateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Campaign Title</label>
              <input 
                type="text" 
                placeholder="e.g. May Premium Discount Offer" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Message Content Template</label>
              <textarea 
                rows={5}
                placeholder="Hello {{name}}, we have a special deal for you!" 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="form-textarea"
                style={{ resize: 'none' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                💡 Tip: Use <code>{"{{name}}"}</code> to insert the customer's name dynamically.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Target Audience Segment (Tag)</label>
              <select 
                value={targetTag}
                onChange={(e) => setTargetTag(e.target.value)}
                className="form-select"
              >
                <option value="">All contacts ({contacts.length} leads)</option>
                {getAvailableTags().map(tag => (
                  <option key={tag} value={tag}>Contacts tagged with "{tag}"</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Schedule Time (Optional)</label>
              <input 
                type="datetime-local" 
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="form-input"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Leave empty to trigger broadcast instantly.
              </span>
            </div>

            {/* Target warning details */}
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.1)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)'
            }}>
              🎯 Target segment will broadcast to <strong>{getMatchedContactsCount()}</strong> matching contacts.
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: '100%' }}
            >
              <Send size={16} />
              <span>{submitting ? 'Scheduling...' : 'Queue Broadcast Campaign'}</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Queue monitoring list */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Megaphone size={18} style={{ color: 'var(--primary-green)' }} />
              <span>Broadcast Queue Logs</span>
            </h3>
            <button 
              onClick={fetchCampaigns} 
              className="btn btn-secondary" 
              style={{ padding: '6px 10px', fontSize: '0.75rem' }}
            >
              <RefreshCw size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '540px' }}>
            {campaigns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <Calendar size={36} strokeWidth={1.5} style={{ marginBottom: '10px' }} />
                <p style={{ fontSize: '0.85rem' }}>No broadcast records scheduled yet.</p>
              </div>
            ) : (
              campaigns.map(camp => {
                const percentage = camp.total_count > 0 
                  ? Math.round((camp.sent_count / camp.total_count) * 100)
                  : 0;

                const getStatusColor = (status: string) => {
                  switch (status) {
                    case 'Completed': return '#10b981';
                    case 'Sending': return '#3b82f6';
                    case 'Scheduled': return '#f59e0b';
                    case 'Cancelled': return '#ef4444';
                    default: return '#6b7c77';
                  }
                };

                return (
                  <div 
                    key={camp.id} 
                    className="premium-card" 
                    style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>{camp.title}</h4>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Scheduled: {new Date(camp.schedule_time).toLocaleString()}
                        </span>
                      </div>
                      
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        backgroundColor: `${getStatusColor(camp.status)}15`,
                        color: getStatusColor(camp.status),
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        {camp.status}
                      </span>
                    </div>

                    <div style={{
                      backgroundColor: 'rgba(0,0,0,0.02)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'monospace',
                      borderLeft: '2px solid var(--border-light)'
                    }}>
                      "{camp.message_content}"
                    </div>

                    {/* Progress details */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 500 }}>
                        <span>Transmission Status</span>
                        <span>{camp.sent_count} / {camp.total_count} Delivered ({percentage}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: camp.status === 'Cancelled' ? 'var(--danger)' : 'var(--primary-green)',
                          borderRadius: '3px',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                    </div>

                    {/* Action buttons */}
                    {camp.status === 'Scheduled' && (
                      <button
                        onClick={() => cancelCampaign(camp.id)}
                        className="btn btn-secondary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          color: '#f87171',
                          borderColor: 'rgba(239, 68, 68, 0.2)',
                          width: 'fit-content',
                          alignSelf: 'flex-end'
                        }}
                      >
                        <Ban size={12} />
                        <span>Cancel Schedule</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
