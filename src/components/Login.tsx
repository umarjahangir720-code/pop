import React, { useState } from 'react';
import { Mail, Lock, User, Phone, LogIn, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import type { User as UserType } from '../types';

interface LoginProps {
  onLoginSuccess: (user: UserType, token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  
  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Please provide email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        onLoginSuccess(data.user, data.token);
      } else {
        setError(data.error || 'Invalid credentials. Use demo@prowp.com / password');
      }
    } catch (err) {
      setError('Cannot connect to Express authorization server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!regEmail.trim() || !regPassword.trim() || !regFirstName.trim()) {
      setError('First name, email, and password are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          first_name: regFirstName,
          last_name: regLastName,
          phone: regPhone
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        onLoginSuccess(data.user, data.token);
      } else {
        setError(data.error || 'Failed to register new account.');
      }
    } catch (err) {
      setError('Communication problem during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      
      <div className="login-card" style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Brand Banner */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: 'var(--primary-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '1.4rem',
            color: 'white',
            margin: '0 auto 12px',
            boxShadow: '0 0 20px var(--primary-green)'
          }}>
            W
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
            {isRegister ? 'Create SaaS Account' : 'Welcome to proWP'}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {isRegister 
              ? 'Register details to initiate marketing automations.' 
              : 'Log in using your account to open your active CRM.'
            }
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            color: '#f87171',
            padding: '10px 14px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            fontSize: '0.8rem',
            marginBottom: '16px'
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* MOCK LOGIN AUTO-FILL DETAILS */}
        {!isRegister && (
          <div style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(47, 160, 132, 0.05)',
            border: '1px solid rgba(47, 160, 132, 0.15)',
            borderRadius: '8px',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <Sparkles size={14} style={{ color: 'var(--primary-green)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <strong>Quick Demo Access:</strong> Use Email: <code>demo@prowp.com</code> and Password: <code>password</code> for instant setup.
            </div>
          </div>
        )}

        {/* LOGIN FORM */}
        {!isRegister ? (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: '10px', top: '13px', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  placeholder="e.g. demo@prowp.com" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '32px', fontSize: '0.85rem' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Account Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: '10px', top: '13px', color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '32px', fontSize: '0.85rem' }}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '8px' }}
            >
              <LogIn size={16} />
              <span>{loading ? 'Logging in...' : 'Sign In'}</span>
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Don't have a SaaS account?{' '}
              <button 
                type="button" 
                onClick={() => {
                  setIsRegister(true);
                  setError('');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--primary-green)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Sign Up
              </button>
            </p>
          </form>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="John" 
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '32px', fontSize: '0.8rem', padding: '8px 10px 8px 32px' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Last Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Doe" 
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '32px', fontSize: '0.8rem', padding: '8px 10px 8px 32px' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  placeholder="name@email.com" 
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '32px', fontSize: '0.8rem', padding: '8px 10px 8px 32px' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Connection</label>
              <div style={{ position: 'relative' }}>
                <Phone size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="+1 (123) 456-7890" 
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '32px', fontSize: '0.8rem', padding: '8px 10px 8px 32px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Account Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  placeholder="Min 6 characters" 
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '32px', fontSize: '0.8rem', padding: '8px 10px 8px 32px' }}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '6px' }}
            >
              <ArrowRight size={16} />
              <span>{loading ? 'Creating...' : 'Register Account'}</span>
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Already registered?{' '}
              <button 
                type="button" 
                onClick={() => {
                  setIsRegister(false);
                  setError('');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--primary-green)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Sign In
              </button>
            </p>
          </form>
        )}

      </div>

    </div>
  );
};
export default Login;
