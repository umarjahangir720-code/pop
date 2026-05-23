import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  ArrowLeft, 
  ArrowRight, 
  Trash2, 
  AlertCircle, 
  List, 
  KanbanSquare 
} from 'lucide-react';
import type { Contact } from '../types';

interface CRMProps {
  // Empty params
}

export const CRM: React.FC<CRMProps> = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [stage, setStage] = useState<'New Lead' | 'Interested' | 'Follow Up' | 'Convertible' | 'Converted' | 'Lost'>('New Lead');
  const [notes, setNotes] = useState('');

  // Bulk Import State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [contactsList, setContactsList] = useState('');
  const [bulkStage, setBulkStage] = useState<'New Lead' | 'Interested' | 'Follow Up' | 'Convertible' | 'Converted' | 'Lost'>('New Lead');
  const [bulkTags, setBulkTags] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      console.error("Failed to load contacts inside CRM:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !phone.trim()) {
      setError('Contact Name and Phone Number are required.');
      return;
    }

    try {
      const parsedTags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name,
          phone_number: phone,
          tags: parsedTags,
          stage,
          notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setName('');
        setPhone('');
        setTagsInput('');
        setStage('New Lead');
        setNotes('');
        setShowAddModal(false);
        fetchContacts();
      } else {
        setError(data.error || 'Failed to register contact.');
      }
    } catch (err) {
      setError('Server connection failed while saving lead.');
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!contactsList.trim()) {
      setError('Please enter at least one contact to import.');
      return;
    }

    setBulkSubmitting(true);
    try {
      const parsedTags = bulkTags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const res = await fetch('/api/contacts/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          contactsList,
          stage: bulkStage,
          tags: parsedTags.length > 0 ? parsedTags : ['Bulk Import']
        })
      });

      const data = await res.json();
      if (res.ok) {
        setContactsList('');
        setBulkTags('');
        setBulkStage('New Lead');
        setShowBulkModal(false);
        fetchContacts();
      } else {
        setError(data.error || 'Failed to import contacts.');
      }
    } catch (err) {
      setError('Server connection failed while importing.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const updateLeadStage = async (contactId: string, newStage: string) => {
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ stage: newStage })
      });
      if (res.ok) {
        fetchContacts();
      }
    } catch (err) {
      console.error("Failed to update lead pipeline stage:", err);
    }
  };

  const deleteContact = async (contactId: string) => {
    if (!window.confirm("Are you sure you want to delete this lead and their entire chat records?")) return;
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        fetchContacts();
      }
    } catch (err) {
      console.error("Failed to delete lead:", err);
    }
  };

  const stages: ('New Lead' | 'Interested' | 'Follow Up' | 'Convertible' | 'Converted' | 'Lost')[] = [
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
    <div style={{ padding: '32px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', letterSpacing: '-0.5px', margin: 0 }}>Customer Pipeline CRM</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
            Segment audiences, drag stages, append log diaries, and view detailed interaction notes.
          </p>
        </div>

        {/* View toggles & additions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            display: 'flex',
            background: 'var(--light-card)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            padding: '4px'
          }}>
            <button
              onClick={() => setViewMode('kanban')}
              style={{
                padding: '6px 12px',
                border: 'none',
                background: viewMode === 'kanban' ? 'rgba(47, 160, 132, 0.1)' : 'transparent',
                color: viewMode === 'kanban' ? 'var(--primary-green)' : 'var(--text-muted)',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              <KanbanSquare size={14} />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 12px',
                border: 'none',
                background: viewMode === 'list' ? 'rgba(47, 160, 132, 0.1)' : 'transparent',
                color: viewMode === 'list' ? 'var(--primary-green)' : 'var(--text-muted)',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              <List size={14} />
              <span>List Grid</span>
            </button>
          </div>

          <button 
            className="btn btn-secondary"
            onClick={() => setShowBulkModal(true)}
            style={{ marginRight: '8px' }}
          >
            <PlusCircle size={16} />
            <span>Bulk Import</span>
          </button>

          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <PlusCircle size={16} />
            <span>Add New Lead</span>
          </button>
        </div>
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

      {/* VIEW 1: Kanban Board stage organizer */}
      {viewMode === 'kanban' ? (
        <div className="kanban-board">
          {stages.map((stg) => {
            const stageLeads = contacts.filter(c => c.stage === stg);
            
            return (
              <div key={stg} className="kanban-column">
                <div className="column-header">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{stg}</span>
                  <span className="column-badge">{stageLeads.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                  {stageLeads.map((lead) => {
                    const stageIdx = stages.indexOf(lead.stage);
                    
                    return (
                      <div key={lead.id} className="kanban-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span className="kanban-card-title">{lead.name}</span>
                          <button 
                            onClick={() => deleteContact(lead.id)}
                            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <span className="kanban-card-phone">{lead.phone_number}</span>
                        
                        {lead.notes && (
                          <p style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            background: 'rgba(0,0,0,0.01)',
                            padding: '6px',
                            borderRadius: '4px',
                            marginTop: '8px',
                            borderLeft: '2px solid var(--border-light)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {lead.notes}
                          </p>
                        )}

                        <div className="kanban-tags">
                          {lead.tags.map(t => (
                            <span key={t} className="tag-badge">{t}</span>
                          ))}
                        </div>

                        {/* Pipeline shift handlers */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: '12px',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--border-light)'
                        }}>
                          <button
                            disabled={stageIdx === 0}
                            onClick={() => updateLeadStage(lead.id, stages[stageIdx - 1])}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: stageIdx === 0 ? '#cbd5e1' : 'var(--primary-green)',
                              cursor: stageIdx === 0 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <ArrowLeft size={14} />
                          </button>
                          
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', alignSelf: 'center' }}>
                            Shift stage
                          </span>

                          <button
                            disabled={stageIdx === stages.length - 1}
                            onClick={() => updateLeadStage(lead.id, stages[stageIdx + 1])}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: stageIdx === stages.length - 1 ? '#cbd5e1' : 'var(--primary-green)',
                              cursor: stageIdx === stages.length - 1 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW 2: Lead details grid table */
        <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-light)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>WhatsApp Number</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Active Tags</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Pipeline Stage</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Interaction notes</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No leads registered in database.
                  </td>
                </tr>
              ) : (
                contacts.map(lead => (
                  <tr key={lead.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 500 }}>{lead.name}</td>
                    <td style={{ padding: '14px 20px' }}>{lead.phone_number}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {lead.tags.map(t => (
                          <span key={t} className="tag-badge">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <select
                        value={lead.stage}
                        onChange={(e) => updateLeadStage(lead.id, e.target.value)}
                        className="form-select"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px' }}
                      >
                        {stages.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.notes || 'None logged'}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => deleteContact(lead.id)}
                        className="btn btn-secondary"
                        style={{ padding: '6px', color: '#ef4444', borderColor: 'transparent' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead Insertion Popup Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px', backgroundColor: 'var(--light-card)' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Register New Pipeline Lead</h3>
            
            <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Lead Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Jane Smith" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp Number (inc. area code)</label>
                <input 
                  type="text" 
                  placeholder="e.g. +1987654321" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Initial Segment Tags (comma-separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. VIP, Prospect, Hot Lead" 
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pipeline Stage</label>
                <select 
                  value={stage} 
                  onChange={(e) => setStage(e.target.value as any)}
                  className="form-select"
                >
                  {stages.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">CRM Diary / Diary Notes</label>
                <textarea 
                  rows={3} 
                  placeholder="Insert notes regarding acquisition source or interest levels..." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-textarea"
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Register Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '28px', backgroundColor: 'var(--light-card)' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '14px' }}>Bulk Import Contacts</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px' }}>
              Enter contacts, one per line. Format: <code>Name, Phone</code> or just <code>Phone</code>.
              Example:<br />
              <code>John Doe, +1234567890</code><br />
              <code>+19876543210</code>
            </p>
            
            <form onSubmit={handleBulkImport} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Contacts List</label>
                <textarea 
                  rows={6} 
                  placeholder="John Doe, +1234567890&#10;+19876543210" 
                  value={contactsList}
                  onChange={(e) => setContactsList(e.target.value)}
                  className="form-textarea"
                  style={{ resize: 'none', fontFamily: 'monospace', fontSize: '0.8rem' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Initial Segment Tags (comma-separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Bulk Import, May Promo" 
                  value={bulkTags}
                  onChange={(e) => setBulkTags(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pipeline Stage</label>
                <select 
                  value={bulkStage} 
                  onChange={(e) => setBulkStage(e.target.value as any)}
                  className="form-select"
                >
                  {stages.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowBulkModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={bulkSubmitting}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {bulkSubmitting ? 'Importing...' : 'Import Contacts'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default CRM;
