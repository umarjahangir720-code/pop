import { useState, useEffect } from 'react';
import type { User, WhatsAppSession } from './types';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { QRConnection } from './components/QRConnection';
import { Messaging } from './components/Messaging';
import { Campaigns } from './components/Campaigns';
import { CRM } from './components/CRM';
import { Automation } from './components/Automation';
import { Admin } from './components/Admin';
import { Profile } from './components/Profile';
import { Billing } from './components/Billing';
import { Login } from './components/Login';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appInitializing, setAppInitializing] = useState(true);
  const [loadingApp, setLoadingApp] = useState(true);

  // Sync auth session state
  const syncUserState = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        
        // Fetch matching session status
        const sessRes = await fetch('/api/session/status', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        if (sessRes.ok) {
          const sessData = await sessRes.json();
          setSession(sessData);
        }
      } else {
        // Bad token
        handleLogout();
      }
    } catch (err) {
      console.error("Failed to sync user attributes on boot:", err);
    } finally {
      setLoadingApp(false);
    }
  };

  useEffect(() => {
    // 1. Interactive preloader trigger (2 seconds minimum)
    const initTimer = setTimeout(() => {
      setAppInitializing(false);
    }, 2000);

    // 2. Check token on start
    if (token) {
      syncUserState(token);
    } else {
      setLoadingApp(false);
    }

    return () => clearTimeout(initTimer);
  }, [token]);

  // High Frequency Polling for WhatsApp status (Connected / Connecting / Disconnected)
  useEffect(() => {
    if (!token) return;
    
    const fetchSessionStatus = async () => {
      try {
        const res = await fetch('/api/session/status', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        }
      } catch (err) {
        console.error("Failed to check active session status:", err);
      }
    };

    const interval = setInterval(fetchSessionStatus, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const handleLoginSuccess = (loggedInUser: User, sessionToken: string) => {
    setToken(sessionToken);
    setUser(loggedInUser);
    setLoadingApp(false);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setSession(null);
    setActiveTab('dashboard');
  };

  const handleProfileChange = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleTierChange = (newTier: string) => {
    if (user) {
      setUser({
        ...user,
        tier: newTier as any
      });
    }
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} session={session} setActiveTab={setActiveTab} />;
      case 'session':
        return <QRConnection session={session} onSessionChange={(s) => setSession(s)} />;
      case 'messaging':
        return <Messaging session={session} />;
      case 'campaigns':
        return <Campaigns />;
      case 'crm':
        return <CRM />;
      case 'automation':
        return <Automation />;
      case 'admin':
        return <Admin />;
      case 'profile':
        return <Profile user={user} onProfileUpdate={handleProfileChange} />;
      case 'billing':
        return <Billing user={user} onTierUpdate={handleTierChange} />;
      default:
        return <Dashboard user={user} session={session} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <>
      {/* 1. Brand Preloader preloading overlays */}
      {appInitializing && (
        <div className="preloader-screen">
          <div className="preloader-logo">proWP</div>
          <div className="preloader-spinner"></div>
          <p style={{ marginTop: '20px', color: '#8e9e9a', fontSize: '0.85rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Launching Marketing & CRM Platform...
          </p>
        </div>
      )}

      {/* 2. Main Page Render */}
      {!appInitializing && (
        <>
          {!token ? (
            <Login onLoginSuccess={handleLoginSuccess} />
          ) : (
            <>
              {loadingApp ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', background: 'var(--bg-app)' }}>
                  <div className="preloader-spinner" style={{ borderColor: 'rgba(47, 160, 132, 0.1)', borderLeftColor: 'var(--primary-green)' }}></div>
                </div>
              ) : (
                <>
                  {/* Sidebar Navigation */}
                  <Sidebar 
                    activeTab={activeTab} 
                    setActiveTab={setActiveTab} 
                    user={user} 
                    session={session} 
                    onLogout={handleLogout} 
                  />

                  {/* Main Display Frame */}
                  <div style={{ flex: 1, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {renderActiveTabContent()}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}

export default App;
