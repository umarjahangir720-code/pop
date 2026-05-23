import React, { useState } from 'react';
import { CreditCard, Check, AlertCircle, Sparkles } from 'lucide-react';
import type { User } from '../types';

interface BillingProps {
  user: User | null;
  onTierUpdate: (newTier: string) => void;
}

export const Billing: React.FC<BillingProps> = ({ user, onTierUpdate }) => {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState('');

  const plans = [
    {
      id: 'free',
      title: 'Free Plan',
      price: '$0',
      period: 'forever',
      features: [
        'WhatsApp Session Connection',
        'Limit to 5 CRM Contacts',
        'Limit to 1 Scheduled Campaign',
        'Limit to 2 Keyword Automations',
        'Basic SVG Dashboard Analytics',
        'Interactive Sandbox Simulator'
      ]
    },
    {
      id: 'starter',
      title: 'Starter Plan',
      price: '$19',
      period: 'month',
      badge: 'Popular',
      features: [
        'WhatsApp Session Connection',
        'Limit to 20 CRM Contacts',
        'Limit to 5 Scheduled Campaigns',
        'Limit to 10 Keyword Automations',
        'Advanced SVG Dashboard Analytics',
        'Interactive Sandbox Simulator',
        'Priority Session Reconnection'
      ]
    },
    {
      id: 'professional',
      title: 'Professional Plan',
      price: '$49',
      period: 'month',
      badge: 'Best Value',
      features: [
        'WhatsApp Session Connection',
        'Unlimited CRM Contacts',
        'Unlimited Scheduled Campaigns',
        'Unlimited Keyword Automations',
        'Deep Conversion Funnels SVG',
        'Interactive Sandbox Simulator',
        'Dedicated Connection Tunnel',
        '24/7 Agent Support'
      ]
    },
    {
      id: 'agency',
      title: 'Agency Plan',
      price: '$129',
      period: 'month',
      features: [
        'All Professional Tier Features',
        'Multi-session management console',
        'Custom Webhooks integrations',
        'Custom Brand labels styling',
        'Custom system preloader screen',
        'Premium API Access logs',
        'Dedicated Account CRM Manager'
      ]
    }
  ];

  const handleUpgrade = async (tierId: string) => {
    setError('');
    setLoadingTier(tierId);

    try {
      const res = await fetch('/api/auth/tier', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ tier: tierId })
      });

      const data = await res.json();
      if (res.ok) {
        onTierUpdate(tierId);
      } else {
        setError(data.error || 'Failed to update billing plan.');
      }
    } catch (err) {
      setError('Communication problem with Express Billing Engine.');
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div style={{ padding: '32px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h1 style={{ fontSize: '2rem', letterSpacing: '-0.5px', margin: 0 }}>SaaS Pricing Plans</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
          Select pricing tiers, unlock deep analytics funnel layers, and increase campaign schedule limitations.
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

      {/* Pricing Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', alignItems: 'stretch' }}>
        {plans.map(plan => {
          const isCurrent = user?.tier === plan.id;
          const isLoading = loadingTier === plan.id;
          
          return (
            <div 
              key={plan.id} 
              className="glass-panel" 
              style={{
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                padding: '24px',
                border: isCurrent ? '2.5px solid var(--primary-green)' : '1px solid var(--glass-border)',
                transform: isCurrent ? 'scale(1.02)' : 'scale(1)',
                position: 'relative',
                transition: 'transform 0.2s, border-color 0.2s'
              }}
            >
              {plan.badge && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '20px',
                  backgroundColor: plan.id === 'professional' ? '#fbbf24' : 'var(--primary-green)',
                  color: plan.id === 'professional' ? '#000' : '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}>
                  <Sparkles size={10} />
                  <span>{plan.badge}</span>
                </div>
              )}

              {/* Title & Price */}
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>{plan.title}</h3>
                
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '20px 0 10px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'var(--font-title)', color: 'var(--text-main)' }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/{plan.period}</span>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '24px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
                  Enables core WhatsApp features matching SaaS spec limitations.
                </p>

                {/* Features Checklist */}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {plan.features.map((feat, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                      <Check size={14} style={{ color: 'var(--primary-green)', marginTop: '2px', flexShrink: 0 }} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action upgrade button */}
              <button
                disabled={isCurrent || isLoading}
                onClick={() => handleUpgrade(plan.id)}
                className="btn"
                style={{
                  width: '100%',
                  marginTop: '30px',
                  background: isCurrent 
                    ? 'rgba(47, 160, 132, 0.1)' 
                    : plan.id === 'professional' 
                      ? 'var(--primary-green)' 
                      : 'transparent',
                  color: isCurrent 
                    ? 'var(--primary-green)' 
                    : plan.id === 'professional' 
                      ? 'white' 
                      : 'var(--text-main)',
                  border: isCurrent 
                    ? 'none' 
                    : plan.id === 'professional' 
                      ? 'none' 
                      : '1px solid var(--border-light)',
                  cursor: isCurrent ? 'default' : 'pointer',
                  fontWeight: 600
                }}
              >
                {isLoading ? 'Processing...' : isCurrent ? 'Current Tier Active' : `Select ${plan.title}`}
              </button>

            </div>
          );
        })}
      </div>

      <div className="glass-panel" style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
        <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '8px' }}>
          <CreditCard size={24} />
        </div>
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Billing Security Details</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            We implement mock payment integrations. No real debit cards required to switch tiers and inspect limit warning modals.
          </p>
        </div>
      </div>

    </div>
  );
};
