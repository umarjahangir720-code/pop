import React, { useState } from 'react';
import { UserCheck, Save, Calendar, Phone, Mail, User, CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';
import type { User as UserType } from '../types';

interface ProfileProps {
  user: UserType | null;
  onProfileUpdate: (updatedUser: UserType) => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onProfileUpdate }) => {
  // Form values
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dob, setDob] = useState(user?.date_of_birth || '');
  const [gender, setGender] = useState(user?.gender || 'Other');
  const [profileImage, setProfileImage] = useState(user?.profile_image || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const avatarOptions = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', // Male avatar
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', // Female avatar
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80', // Alternate male
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80', // Alternate female
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'  // Neutral professional
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfileImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
          date_of_birth: dob,
          gender,
          profile_image: profileImage
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Profile attributes updated successfully!');
        onProfileUpdate(data);
      } else {
        setError(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      setError('Communication problem with Express profiles engine.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '32px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div>
        <h1 style={{ fontSize: '2rem', letterSpacing: '-0.5px', margin: 0 }}>My SaaS Profile</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
          Configure user attributes, assign direct contact variables, and choose display presets.
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
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        
        {/* LEFT COLUMN: Profile summary info */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 'fit-content', gap: '20px' }}>
          
          <div className="profile-avatar-upload" style={{ margin: '0', width: '120px', height: '120px' }}>
            <img 
              src={profileImage || 'https://api.dicebear.com/7.x/initials/svg?seed=U'} 
              alt="Avatar" 
              className="profile-avatar-img"
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{firstName} {lastName}</h3>
            <span style={{
              fontSize: '0.7rem',
              backgroundColor: 'var(--primary-green)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '10px',
              textTransform: 'uppercase',
              fontWeight: 600,
              display: 'inline-block',
              marginTop: '6px'
            }}>
              {user?.tier} tier
            </span>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', width: '100%', paddingTop: '16px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
              <Mail size={16} />
              <span style={{ color: 'var(--text-main)' }}>{user?.email}</span>
            </div>
            {phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                <Phone size={16} />
                <span style={{ color: 'var(--text-main)' }}>{phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Profile Attributes Editor */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={18} style={{ color: 'var(--primary-green)' }} />
            <span>Configure Attributes Details</span>
          </h3>

          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Row 1: Names */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: '10px', top: '13px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '32px' }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: '10px', top: '13px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '32px' }}
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Phone & DOB */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Phone Connection Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: '10px', top: '13px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="e.g. +123456789" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '32px' }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '13px', color: 'var(--text-muted)' }} />
                  <input 
                    type="date" 
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '32px' }}
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Gender */}
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select 
                value={gender} 
                onChange={(e) => setGender(e.target.value)}
                className="form-select"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Row 4: Choose avatar profile picture */}
            <div className="form-group">
              <label className="form-label">Select Avatar Display Image</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
                {avatarOptions.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setProfileImage(url)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      padding: 0,
                      border: profileImage === url ? '3px solid var(--primary-green)' : '1px solid var(--border-light)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      transition: 'transform 0.1s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <img src={url} alt={`Preset ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
              
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Or upload your own:</span>
                <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}>
                  <UploadCloud size={14} />
                  <span>Browse...</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    style={{ display: 'none' }} 
                  />
                </label>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving}
              style={{ width: 'fit-content', display: 'flex', alignSelf: 'flex-end', gap: '8px' }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving updates...' : 'Save Profile Details'}</span>
            </button>

          </form>

        </div>

      </div>
    </div>
  );
};
export default Profile;
