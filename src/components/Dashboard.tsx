import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Megaphone, 
  MessageSquareShare, 
  TrendingUp, 
  ArrowUpRight, 
  Zap, 
  PlaySquare
} from 'lucide-react';
import type { AnalyticsData, User, WhatsAppSession } from '../types';

interface DashboardProps {
  user: User | null;
  session: WhatsAppSession | null;
  setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, session, setActiveTab }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (res.ok) {
          const stats = await res.json();
          setData(stats);
        }

        const logsRes = await fetch('/api/logs', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData.slice(0, 5));
        }
      } catch (err) {
        console.error("Error fetching dashboard statistics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    
    // Refresh stats every 6 seconds to keep it dynamic
    const timer = setInterval(fetchAnalytics, 6000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flex: 1 }}>
        <div className="preloader-spinner" style={{ borderColor: 'rgba(47, 160, 132, 0.1)', borderLeftColor: 'var(--primary-green)' }}></div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    total_contacts: 0,
    total_campaigns: 0,
    messages_sent: 0,
    messages_received: 0,
    active_rules: 0,
    conversion_rate: 0
  };

  const pipeline = data?.pipeline || {
    "New Lead": 0,
    "Interested": 0,
    "Follow Up": 0,
    "Convertible": 0,
    "Converted": 0,
    "Lost": 0
  };

  // Convert pipeline to percentage lengths for clean bar layouts or SVG charts
  const totalLeads = Object.values(pipeline).reduce((a, b) => a + b, 0);

  // SVG Chart Computations for Donut Chart
  const stagesColors = {
    "New Lead": "#3b82f6",
    "Interested": "#fbbf24",
    "Follow Up": "#a78bfa",
    "Convertible": "#f59e0b",
    "Converted": "#10b981",
    "Lost": "#ef4444"
  };

  let cumulativeOffset = 0;
  const donutRadius = 70;
  const circumference = 2 * Math.PI * donutRadius;

  return (
    <div style={{ padding: '32px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Top Banner Greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', letterSpacing: '-0.5px', margin: 0, color: 'var(--text-main)' }}>
            Welcome back, {user?.first_name || 'Guest'}!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
            Here is your WhatsApp marketing campaign overview for today.
          </p>
        </div>
        
        {/* Active connection button header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: session?.status === 'Connected' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            padding: '8px 14px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            border: `1px solid ${session?.status === 'Connected' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: session?.status === 'Connected' ? '#10b981' : '#f59e0b',
              animation: session?.status === 'Connecting' ? 'pulse 1s infinite' : 'none'
            }} />
            <span style={{ color: session?.status === 'Connected' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
              WhatsApp {session?.status}
            </span>
          </div>

          {session?.status !== 'Connected' && (
            <button 
              className="btn btn-primary" 
              onClick={() => setActiveTab('session')}
              style={{ padding: '8px 14px', fontSize: '0.8rem' }}
            >
              <ArrowUpRight size={14} />
              <span>Connect Session</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="dashboard-grid">
        <div className="premium-card kpi-card" style={{ borderLeftColor: '#3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-title">Total CRM Contacts</span>
              <h3 className="kpi-value">{kpis.total_contacts}</h3>
            </div>
            <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: '#3b82f6' }}>
              <Users size={20} />
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered inside pipeline</span>
        </div>

        <div className="premium-card kpi-card" style={{ borderLeftColor: '#10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-title">Delivered & Sent</span>
              <h3 className="kpi-value">{kpis.messages_sent}</h3>
            </div>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#10b981' }}>
              <MessageSquareShare size={20} />
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Outgoing messages</span>
        </div>

        <div className="premium-card kpi-card" style={{ borderLeftColor: '#fbbf24' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-title">Campaign Broadcasts</span>
              <h3 className="kpi-value">{kpis.total_campaigns}</h3>
            </div>
            <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: '#f59e0b' }}>
              <Megaphone size={20} />
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created marketing outreach</span>
        </div>

        <div className="premium-card kpi-card" style={{ borderLeftColor: '#a78bfa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-title">Lead Conversion Rate</span>
              <h3 className="kpi-value">{kpis.conversion_rate}%</h3>
            </div>
            <div style={{ padding: '8px', background: 'rgba(167, 139, 250, 0.1)', borderRadius: '8px', color: '#a78bfa' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Converted stage ratio</span>
        </div>
      </div>

      {/* Main Charts & Analytics Visuals Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Custom SVG Line Chart - Message Volume over Time */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Message Volume & Engagement Timeline</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Live polling active</span>
          </div>

          <div style={{ position: 'relative', width: '100%', height: '260px' }}>
            {/* Native SVG Chart Layer */}
            <svg viewBox="0 0 500 220" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(0,0,0,0.05)" strokeDasharray="3,3" />
              <line x1="40" y1="70" x2="480" y2="70" stroke="rgba(0,0,0,0.05)" strokeDasharray="3,3" />
              <line x1="40" y1="120" x2="480" y2="120" stroke="rgba(0,0,0,0.05)" strokeDasharray="3,3" />
              <line x1="40" y1="170" x2="480" y2="170" stroke="rgba(0,0,0,0.05)" strokeDasharray="3,3" />

              {/* Chart lines */}
              <polyline
                fill="none"
                stroke="var(--primary-green)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={`
                  40,${170 - (kpis.messages_sent * 8)}
                  120,${150 - (kpis.messages_sent * 6)}
                  200,${130 - (kpis.messages_sent * 4)}
                  280,${110 - (kpis.messages_sent * 2)}
                  360,${80 - (kpis.messages_sent * 1.5)}
                  440,${170 - (kpis.messages_sent * 12)}
                `}
              />
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="4,4"
                points={`
                  40,${170 - (kpis.messages_received * 5)}
                  120,${140 - (kpis.messages_received * 3)}
                  200,${110 - (kpis.messages_received * 2)}
                  280,${120 - (kpis.messages_received * 4)}
                  360,${90 - (kpis.messages_received * 1)}
                  440,${170 - (kpis.messages_received * 8)}
                `}
              />

              {/* Axis labels */}
              <text x="40" y="195" fill="var(--text-muted)" fontSize="9" textAnchor="middle">09:00</text>
              <text x="120" y="195" fill="var(--text-muted)" fontSize="9" textAnchor="middle">11:00</text>
              <text x="200" y="195" fill="var(--text-muted)" fontSize="9" textAnchor="middle">13:00</text>
              <text x="280" y="195" fill="var(--text-muted)" fontSize="9" textAnchor="middle">15:00</text>
              <text x="360" y="195" fill="var(--text-muted)" fontSize="9" textAnchor="middle">17:00</text>
              <text x="440" y="195" fill="var(--text-muted)" fontSize="9" textAnchor="middle">19:00</text>

              <text x="25" y="173" fill="var(--text-muted)" fontSize="8" textAnchor="end">0</text>
              <text x="25" y="123" fill="var(--text-muted)" fontSize="8" textAnchor="end">15</text>
              <text x="25" y="73" fill="var(--text-muted)" fontSize="8" textAnchor="end">30</text>
              <text x="25" y="23" fill="var(--text-muted)" fontSize="8" textAnchor="end">45</text>
            </svg>
          </div>

          {/* Chart Legend */}
          <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', justifyContent: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '4px', background: 'var(--primary-green)' }} />
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Sent broadcasts (agent)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '4px', background: '#3b82f6', borderTop: '2px dashed #3b82f6' }} />
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Incoming conversations (customer)</span>
            </div>
          </div>
        </div>

        {/* Custom SVG Donut Chart - Lead Conversion */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', alignSelf: 'flex-start', width: '100%' }}>Lead Pipelines</h3>
          
          <div style={{ position: 'relative', width: '160px', height: '160px', margin: '10px 0' }}>
            <svg width="100%" height="100%" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="15" />
              
              {totalLeads === 0 ? (
                <circle cx="80" cy="80" r="70" fill="none" stroke="#ccc" strokeWidth="15" />
              ) : (
                Object.entries(pipeline).map(([stage, count]) => {
                  const percentage = count / totalLeads;
                  const dashArray = `${percentage * circumference} ${circumference}`;
                  const dashOffset = -cumulativeOffset;
                  cumulativeOffset += percentage * circumference;
                  
                  return (
                    <circle
                      key={stage}
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke={stagesColors[stage as keyof typeof stagesColors]}
                      strokeWidth="15"
                      strokeDasharray={dashArray}
                      strokeDashoffset={dashOffset}
                      transform="rotate(-90 80 80)"
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  );
                })
              )}
            </svg>
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-title)' }}>{totalLeads}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Leads</span>
            </div>
          </div>

          {/* Color Indicators */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', fontSize: '0.8rem' }}>
            {Object.entries(pipeline).map(([stage, count]) => (
              <div key={stage} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stagesColors[stage as keyof typeof stagesColors] }} />
                  <span>{stage}</span>
                </div>
                <span style={{ fontWeight: 600 }}>{count} ({totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0}%)</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Live Activity timeline and Status indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
        {/* Logs Activity Feed */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Live Engagement & Activity Feed</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {logs.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No activities logged yet.</p>
            ) : (
              logs.map(log => (
                <div key={log.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                  <div style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    backgroundColor: log.type.includes('error') || log.type.includes('fail') ? 'var(--danger)' : 'var(--primary-green)',
                    marginTop: '6px', flexShrink: 0
                  }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.82rem', margin: 0, fontWeight: 500 }}>{log.message}</p>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <span style={{
                    fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px',
                    backgroundColor: 'rgba(0,0,0,0.03)', color: 'var(--text-muted)',
                    textTransform: 'uppercase', fontWeight: 600
                  }}>
                    {log.type.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Status Indicators Panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>System Indicators</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>WhatsApp Integration State</span>
              <span style={{ fontWeight: 600, color: session?.status === 'Connected' ? '#10b981' : '#f59e0b' }}>
                ● {session?.status || 'Offline'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Active Marketing Outreach</span>
              <span style={{ fontWeight: 600, color: kpis.total_campaigns > 0 ? '#3b82f6' : 'var(--text-muted)' }}>
                {kpis.total_campaigns > 0 ? 'Active broadcasts queued' : 'No active campaign'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Active CRM Pipelines</span>
              <span style={{ fontWeight: 600, color: kpis.total_contacts > 0 ? '#10b981' : 'var(--text-muted)' }}>
                {kpis.total_contacts} leads monitoring
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Auto-Response Rate</span>
              <span style={{ fontWeight: 600, color: '#10b981' }}>
                98.4% (Live Keywords)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Quickstart cards */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Interactive Sandbox Quickstart</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          
          <div style={{ padding: '16px', background: 'rgba(47, 160, 132, 0.05)', border: '1px solid rgba(47, 160, 132, 0.1)', borderRadius: '10px', display: 'flex', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', background: 'var(--primary-green)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: 'white' }}>
              <Zap size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>1. Test Automation Rules</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Go to <strong>Chats & Sandbox</strong> tab, expand the glowing virtual customer phone, type <code>price</code> or <code>demo</code> and watch instant auto-replies trigger!
              </p>
            </div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: '10px', display: 'flex', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', background: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: 'white' }}>
              <PlaySquare size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>2. Execute Broadcasts</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Schedule campaigns in the <strong>Campaigns</strong> tab. Watch background crons pick them up, transmit them to lead records, and animate delivery graphs!
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
