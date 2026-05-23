import React, { useState, useEffect } from 'react';
import { Terminal, Shield, RefreshCw, Cpu, Activity, CircleDot } from 'lucide-react';
import type { SystemLog } from '../types';

interface AdminProps {
  // Empty
}

export const Admin: React.FC<AdminProps> = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to load server activity logs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Auto-poll logs every 4 seconds
    const timer = setInterval(() => {
      fetchLogs();
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'server_start': return '#10b981';
      case 'incoming_message': return '#3b82f6';
      case 'automation_trigger': return '#a78bfa';
      case 'campaign_start':
      case 'campaign_complete': return '#f59e0b';
      case 'user_login':
      case 'user_register': return '#6fcf97';
      case 'contact_create':
      case 'contact_delete': return '#ec4899';
      default: return '#94a3b8';
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
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', letterSpacing: '-0.5px', margin: 0 }}>System Monitor & Server Logs</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
            Inspect background engine processes, scheduler ticks, campaign dispatches, and active database events.
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            fetchLogs();
          }}
          disabled={refreshing}
          className="btn btn-secondary"
          style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <RefreshCw size={14} className={refreshing ? 'preloader-spinner' : ''} />
          <span>Sync logs</span>
        </button>
      </div>

      {/* Diagnostics widgets grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        
        <div className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px' }}>
            <Activity size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Backend Engine Status</span>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginTop: '2px', color: '#10b981' }}>Active / Healthy</h4>
          </div>
        </div>

        <div className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '8px' }}>
            <Cpu size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scheduler Thread</span>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginTop: '2px' }}>Polling (5s tick)</h4>
          </div>
        </div>

        <div className="premium-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '10px', background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', borderRadius: '8px' }}>
            <Shield size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Persistence Engine</span>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginTop: '2px' }}>JSON DB File-IO</h4>
          </div>
        </div>

      </div>

      {/* Main logs terminal display */}
      <div className="glass-panel" style={{
        padding: '0',
        backgroundColor: '#0c100e',
        border: '1px solid #1c2621',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '500px'
      }}>
        
        {/* Terminal Header */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid #1c2621',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#070a09'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#8e9e9a' }}>
            <Terminal size={14} />
            <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>stdout@prowp-engine-logger</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          </div>
        </div>

        {/* Terminal Body */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: '#cad7d4',
          lineHeight: '1.4'
        }}>
          {logs.length === 0 ? (
            <div style={{ color: '#526661', textAlign: 'center', margin: 'auto' }}>
              <CircleDot size={24} style={{ marginBottom: '8px' }} />
              <p>No engine processes captured yet.</p>
            </div>
          ) : (
            logs.map(log => (
              <div 
                key={log.id} 
                style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  alignItems: 'flex-start',
                  borderBottom: '1px solid #0f1512',
                  paddingBottom: '4px'
                }}
              >
                {/* Log Time */}
                <span style={{ color: '#526661', flexShrink: 0 }}>
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>

                {/* Log Event type */}
                <span style={{ 
                  color: getLogTypeColor(log.type), 
                  fontWeight: 600, 
                  textTransform: 'uppercase',
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  backgroundColor: `${getLogTypeColor(log.type)}15`,
                  flexShrink: 0,
                  minWidth: '100px',
                  textAlign: 'center'
                }}>
                  {log.type.replace('_', ' ')}
                </span>

                {/* Log message */}
                <span style={{ color: '#cad7d4', wordBreak: 'break-all' }}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
export default Admin;
