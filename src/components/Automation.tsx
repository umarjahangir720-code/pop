import React, { useState, useEffect } from 'react';
import { Zap, PlusCircle, Trash2, Key, HelpCircle, MessageSquareText, FileCheck2, AlertCircle, Tag } from 'lucide-react';
import type { AutomationRule } from '../types';

interface AutomationProps {
  // Empty params
}

const TEMPLATE_LIBRARY = [
  {
    name: "👋 Greeting",
    content: "Hello {{name}}! Thank you for reaching out to us. How can we assist you today? We are here to help you."
  },
  {
    name: "🏢 Business Intro",
    content: "Hi {{name}}! Welcome to our business. We specialize in providing top-tier solutions to streamline your workflows. Please let us know what services you are interested in!"
  },
  {
    name: "⚙️ Services Info",
    content: "Hello {{name}}! Here is a brief overview of our services:\n1. CRM & Lead Management\n2. Real-time Marketing Automation\n3. Dynamic Broadcast Campaigns\n\nFor pricing details, reply with 'price'."
  },
  {
    name: "💬 Support Inquiry",
    content: "Hi {{name}}! Our plans start at just $19/mo. We offer Starter, Professional, and Agency tiers tailored to your growth. To learn more or book a demo, reply with 'demo'."
  }
];

export const Automation: React.FC<AutomationProps> = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  
  // Form State
  const [keyword, setKeyword] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [updateStage, setUpdateStage] = useState('');
  const [addTag, setAddTag] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/automation/rules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error("Failed to load automation rules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!keyword.trim() || !replyContent.trim()) {
      setError('Keyword trigger and reply template content are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          keyword: keyword.toLowerCase().trim(),
          reply_content: replyContent,
          update_stage: updateStage || undefined,
          add_tag: addTag || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Automation rule created and loaded in active engine.');
        setKeyword('');
        setReplyContent('');
        setUpdateStage('');
        setAddTag('');
        fetchRules();
      } else {
        setError(data.error || 'Failed to create automation rule.');
      }
    } catch (err) {
      setError('Failed to contact keyword engine on server.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRule = async (ruleId: string) => {
    setError('');
    try {
      const res = await fetch(`/api/automation/rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        fetchRules();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete rule.');
      }
    } catch (err) {
      setError('Failed to delete automation rule.');
    }
  };

  const stages = [
    'New Lead',
    'Interested',
    'Follow Up',
    'Convertible',
    'Converted',
    'Lost'
  ];

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
        <h1 style={{ fontSize: '2rem', letterSpacing: '-0.5px', margin: 0 }}>Marketing Automation Engine</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
          Configure rule-based triggers to parse incoming customer messages, fire auto-replies, and advance pipelines.
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
        
        {/* LEFT COLUMN: Rule Creation form */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={18} style={{ color: 'var(--primary-green)' }} />
            <span>Create Automation Trigger</span>
          </h3>

          <form onSubmit={handleCreateRule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Incoming Message Keyword (Trigger)</label>
              <div style={{ position: 'relative' }}>
                <Key size={14} style={{ position: 'absolute', left: '10px', top: '13px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="e.g. price, demo, support" 
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '32px' }}
                />
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Triggered if incoming message contains this word (case-insensitive).
              </span>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Auto-Reply Text Template</label>
              </div>
              <textarea 
                rows={4}
                placeholder="Hi {{name}}! Thank you for inquiring. Here details..." 
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="form-textarea"
                style={{ resize: 'none' }}
              />
              
              {/* Inline Template Library */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Quick Template Library:</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {TEMPLATE_LIBRARY.map(t => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => setReplyContent(t.content)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.68rem', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.01)' }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Variables supported: <code>{"{{name}}"}</code> to insert customer's full name.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Update CRM Stage</label>
                <select 
                  value={updateStage}
                  onChange={(e) => setUpdateStage(e.target.value)}
                  className="form-select"
                >
                  <option value="">Do not update stage</option>
                  {stages.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Attach Tags</label>
                <input 
                  type="text" 
                  placeholder="e.g. Hot Lead" 
                  value={addTag}
                  onChange={(e) => setAddTag(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: '100%' }}
            >
              <Zap size={16} />
              <span>{submitting ? 'Creating rule...' : 'Deploy Automation Rule'}</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Active Rules summary */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} style={{ color: 'var(--primary-green)' }} />
            <span>Active Keyword Automation Rules ({rules.length})</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '540px' }}>
            {rules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <HelpCircle size={36} strokeWidth={1.5} style={{ marginBottom: '10px' }} />
                <p style={{ fontSize: '0.85rem' }}>No keyword rules deployed yet.</p>
              </div>
            ) : (
              rules.map(rule => (
                <div 
                  key={rule.id} 
                  className="premium-card" 
                  style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(47, 160, 132, 0.1)',
                        color: 'var(--primary-green)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        Keyword: {rule.keyword}
                      </span>
                    </div>

                    <button 
                      onClick={() => deleteRule(rule.id)}
                      className="btn btn-secondary"
                      style={{ padding: '4px', color: '#ef4444', borderColor: 'transparent' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(0,0,0,0.01)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    borderLeft: '2.5px solid var(--primary-green)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <MessageSquareText size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <p style={{ margin: 0, fontStyle: 'italic' }}>"{rule.reply_content}"</p>
                  </div>

                  {(rule.update_stage || rule.add_tag) && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      fontSize: '0.75rem',
                      borderTop: '1px dashed var(--border-light)',
                      paddingTop: '8px'
                    }}>
                      {rule.update_stage && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}>
                          <FileCheck2 size={12} />
                          <span>Stage Set: <strong>{rule.update_stage}</strong></span>
                        </div>
                      )}
                      
                      {rule.add_tag && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-green)' }}>
                          <Tag size={12} />
                          <span>Attach Tag: <strong>{rule.add_tag}</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
