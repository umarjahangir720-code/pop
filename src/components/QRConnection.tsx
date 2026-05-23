import React, { useState, useEffect, useRef } from 'react';
import { QrCode, RefreshCw, AlertCircle, Wifi, CheckCircle2, Smartphone } from 'lucide-react';
import type { WhatsAppSession } from '../types';

interface QRConnectionProps {
  session: WhatsAppSession | null;
  onSessionChange: (session: WhatsAppSession) => void;
}

export const QRConnection: React.FC<QRConnectionProps> = ({ session, onSessionChange }) => {
  const [countdown, setCountdown] = useState(60);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer only while showing QR
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (session?.status === 'Connecting' && qrDataUrl) {
      setCountdown(60);
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(60);
    }
    return () => clearInterval(timer);
  }, [session?.status, qrDataUrl]);

  // Clear QR when moving out of Connecting state
  useEffect(() => {
    if (session?.status !== 'Connecting' && session?.status !== 'Authenticating') {
      if (session?.status === 'Connected' || session?.status === 'Disconnected') {
        setQrDataUrl(null);
      }
    }
  }, [session?.status]);

  // Smart polling: poll when active, slow down when in stable states
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    const status = session?.status;

    // Don't poll at all if disconnected - wait for user action
    if (!session || status === 'Disconnected') return;

    // Poll interval depends on state:
    // - Connecting / Authenticating: poll every 1.5s (need to catch state changes fast)
    // - Reconnecting: poll every 3s (reconnect takes time)
    // - Connected: poll every 10s (just a health check)
    const interval = (status === 'Connecting' || status === 'Authenticating') ? 1500
      : status === 'Reconnecting' ? 3000
      : 10000;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/session/status', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Update QR code if received
          if (data.qrDataUrl) {
            setQrDataUrl(data.qrDataUrl);
          }
          // Update session state if it changed
          if (data.status && data.status !== session.status) {
            onSessionChange(data);
          }
        }
      } catch (err) {
        // Silently ignore network errors during polling
      }
    }, interval);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [session, onSessionChange]);

  const initiateConnection = async () => {
    setError('');
    setLoading(true);
    setQrDataUrl(null);
    try {
      const res = await fetch('/api/session/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        onSessionChange({ ...session!, status: 'Connecting' });
      } else {
        setError(data.error || 'Failed to initiate connection.');
      }
    } catch (err) {
      setError('Server connection failure. Ensure the backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const disconnectSession = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/session/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setQrDataUrl(null);
        onSessionChange({ ...session!, status: 'Disconnected', connected_at: null });
      } else {
        setError(data.error || 'Failed to disconnect.');
      }
    } catch (err) {
      setError('Failed to contact server to close session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h1 style={{ fontSize: '2rem', letterSpacing: '-0.5px', margin: 0, color: 'var(--text-main)' }}>
          WhatsApp Web Integration
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
          Connect your account to enable automations, CRM tracking, and bulk messaging.
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
        
        {/* Main interactive QR visual */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* DISCONNECTED STATE */}
          {session?.status === 'Disconnected' && (
            <div className="qr-container">
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                backgroundColor: 'rgba(47, 160, 132, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary-green)', marginBottom: '20px'
              }}>
                <QrCode size={36} />
              </div>
              <h3>Connect WhatsApp Account</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '320px', marginTop: '8px', marginBottom: '24px' }}>
                Click below to generate a live QR code. Then open WhatsApp on your phone → Linked Devices → Link a Device.
              </p>
              <button
                className="btn btn-primary"
                onClick={initiateConnection}
                disabled={loading}
              >
                {loading ? 'Initializing...' : 'Generate Connection QR'}
              </button>
            </div>
          )}

          {/* CONNECTING STATE - Show QR */}
          {(session?.status === 'Connecting' || session?.status === 'Authenticating' || session?.status === 'Reconnecting') && (
            <div className="qr-container" style={{ width: '100%' }}>
              <h3>
                {session?.status === 'Authenticating' ? '🔐 Verifying Session...' :
                 session?.status === 'Reconnecting' ? '🔄 Reconnecting...' :
                 '📱 Scan with WhatsApp'}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
                {session?.status === 'Authenticating'
                  ? 'QR scanned! Completing authentication — please wait, do not close this page.'
                  : session?.status === 'Reconnecting'
                  ? 'Session interrupted. Restoring connection automatically...'
                  : 'Open WhatsApp → tap ⋮ menu → Linked Devices → Link a Device → scan below.'}
              </p>

              {/* QR Code Box */}
              <div className="qr-code-box" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                {/* Loading overlay when no QR yet or in authenticating state */}
                {(session?.status === 'Authenticating' || session?.status === 'Reconnecting' || !qrDataUrl) && (
                  <div className="syncing-overlay" style={{
                    position: 'absolute', inset: 0,
                    backgroundColor: 'var(--glass-bg)',
                    backdropFilter: 'var(--glass-blur)',
                    WebkitBackdropFilter: 'var(--glass-blur)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    zIndex: 10, gap: '12px'
                  }}>
                    <RefreshCw className="preloader-spinner" size={34} style={{ color: 'var(--primary-green)' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {session?.status === 'Authenticating' ? 'Authenticating with WhatsApp...' :
                       session?.status === 'Reconnecting' ? 'Restoring session...' :
                       'Generating QR code...'}
                    </span>
                    {session?.status === 'Authenticating' && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '200px', textAlign: 'center' }}>
                        WhatsApp is verifying your device. This takes 5-15 seconds.
                      </span>
                    )}
                  </div>
                )}
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="WhatsApp QR Code"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>

              {/* Countdown bar only when QR is visible */}
              {session?.status === 'Connecting' && qrDataUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: countdown <= 10 ? '#f87171' : 'var(--text-muted)', marginBottom: '16px' }}>
                  <RefreshCw size={14} className="preloader-spinner" style={{ animationDuration: '4s' }} />
                  <span>QR expires in {countdown}s</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={initiateConnection}
                  disabled={loading || session?.status === 'Authenticating'}
                  title={session?.status === 'Authenticating' ? 'Wait for authentication to complete' : 'Regenerate QR code'}
                >
                  {loading ? 'Regenerating...' : 'Regenerate QR'}
                </button>
              </div>
            </div>
          )}

          {/* CONNECTED STATE */}
          {session?.status === 'Connected' && (
            <div className="qr-container">
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#10b981', marginBottom: '20px'
              }}>
                <CheckCircle2 size={40} />
              </div>
              <h3 style={{ color: '#10b981' }}>✅ Device Active & Connected</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px', maxWidth: '300px' }}>
                Session established since <strong>{session.connected_at ? new Date(session.connected_at).toLocaleString() : 'just now'}</strong>
              </p>
              
              <div style={{
                margin: '24px 0', padding: '12px 20px',
                background: 'rgba(0,0,0,0.02)', borderRadius: '8px',
                textAlign: 'left', width: '100%', fontSize: '0.8rem',
                border: '1px solid var(--border-light)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                  <span style={{ fontWeight: 600, color: '#10b981' }}>● Live Connection Active</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Browser Ref:</span>
                  <span style={{ fontWeight: 600 }}>{session.device_info || 'WhatsApp Web'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Messages:</span>
                  <span style={{ fontWeight: 600, color: '#10b981' }}>Real-time delivery enabled</span>
                </div>
              </div>

              <button
                className="btn btn-danger"
                onClick={disconnectSession}
                disabled={loading}
              >
                {loading ? 'Disconnecting...' : 'Disconnect Session'}
              </button>
            </div>
          )}

        </div>

        {/* Instructions sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>How to Connect</h3>
            <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <li>
                <strong>Step 1:</strong> Click <em>"Generate Connection QR"</em> and wait for the QR code to appear.
              </li>
              <li>
                <strong>Step 2:</strong> Open <strong>WhatsApp</strong> on your phone. Tap the <strong>⋮ menu</strong> (top right) → <strong>Linked Devices</strong> → <strong>Link a Device</strong>.
              </li>
              <li>
                <strong>Step 3:</strong> Point your camera at the QR code on screen. Keep this page open until you see <em>"Device Active & Connected"</em>.
              </li>
              <li>
                <strong>Step 4:</strong> Once connected, messaging, automations, and campaigns will become fully active! 🎉
              </li>
            </ul>
          </div>

          <div className="glass-panel" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '8px', flexShrink: 0 }}>
              <Smartphone size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Troubleshooting</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.5' }}>
                If you see <em>"Couldn't log in"</em> on your phone: click <strong>Regenerate QR</strong> and try again. Keep this browser tab active while scanning. Make sure your phone has internet access.
              </p>
            </div>
          </div>

          <div className="glass-panel" style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ padding: '10px', background: 'rgba(47, 160, 132, 0.1)', color: 'var(--primary-green)', borderRadius: '8px' }}>
              <Wifi size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Session Persistence</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Your session is saved in <code>server/sessions/</code> — you only need to scan once! It reconnects automatically on server restart.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
