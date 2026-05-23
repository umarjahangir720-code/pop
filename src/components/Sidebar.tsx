import React from 'react';
import { 
  LayoutDashboard, 
  QrCode, 
  MessageSquare, 
  Megaphone, 
  Users, 
  Zap, 
  ShieldAlert, 
  CreditCard, 
  LogOut,
  UserCheck
} from 'lucide-react';
import type { User, WhatsAppSession } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  session: WhatsAppSession | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  user, 
  session, 
  onLogout 
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'session', label: 'WhatsApp Connection', icon: QrCode, badge: session?.status },
    { id: 'messaging', label: 'Chats & Sandbox', icon: MessageSquare },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'crm', label: 'Pipeline CRM', icon: Users },
    { id: 'automation', label: 'Automation Rules', icon: Zap },
    { id: 'admin', label: 'Admin Logs', icon: ShieldAlert },
    { id: 'profile', label: 'My Profile', icon: UserCheck },
    { id: 'billing', label: 'Plans & Pricing', icon: CreditCard }
  ];

  return (
    <div style={{
      width: '280px',
      backgroundColor: 'var(--bg-sidebar)',
      color: '#e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      borderRight: '1px solid var(--border-light)',
      height: '100vh',
      position: 'sticky',
      top: 0
    }}>
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'var(--primary-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            color: 'white',
            boxShadow: '0 0 15px var(--primary-green)'
          }}>
            W
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>proWP SaaS</h2>
            <span style={{ fontSize: '0.7rem', color: '#6fcf97', fontWeight: 500, textTransform: 'uppercase' }}>Marketing & CRM</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div style={{ flex: 1, padding: '20px 12px', overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isActive ? 'rgba(47, 160, 132, 0.15)' : 'transparent',
                    color: isActive ? '#6fcf97' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 600 : 400,
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Icon size={18} style={{ color: isActive ? '#6fcf97' : '#64748b' }} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      backgroundColor: item.badge === 'Connected' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: item.badge === 'Connected' ? '#34d399' : '#fbbf24',
                      fontWeight: 600
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Active User Footer Drawer */}
      {user && (
        <div style={{
          padding: '20px 16px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          backgroundColor: 'rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src={user.profile_image || `https://api.dicebear.com/7.x/initials/svg?seed=${user.first_name}`} 
              alt={user.first_name} 
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--primary-green)' }}
            />
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user.first_name} {user.last_name}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--primary-green)',
                  color: 'white',
                  textTransform: 'uppercase',
                  fontWeight: 600
                }}>
                  {user.tier}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>active</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#fca5a5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.8rem',
              fontWeight: 500,
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
