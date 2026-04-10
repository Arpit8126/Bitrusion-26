import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import GlitchText from '../components/GlitchText';

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  const [form, setForm] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    mobile: '',
    course: '',
    university: '',
    state: '',
    district: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleProfilePic = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500 * 1024) {
        setError('Profile picture must be under 500KB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
        setProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.mobile || !form.course || !form.university || !form.state || !form.district) {
      setError('All fields are required');
      return;
    }

    if (!/^\d{10}$/.test(form.mobile)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        ...form,
        email: user.email,
        uid: user.uid,
        updatedAt: new Date().toISOString(),
      };

      if (profilePic) {
        profileData.profilePic = profilePic;
      }

      await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });
      
      // Also ensure we have it locally immediately
      await refreshProfile();
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to save profile: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-page page-enter">
      <div className="form-container" style={{ maxWidth: '550px' }}>
        <GlitchText text="PROFILE SETUP" tag="h2" className="form-title" />
        <p className="form-subtitle">Complete your hacker profile to proceed</p>

        {error && <div className="form-error" style={{ textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}

        <div className="profile-pic-upload" onClick={() => document.getElementById('profile-pic-input').click()}>
          {profilePicPreview ? (
            <img src={profilePicPreview} alt="Profile" />
          ) : (
            <span className="upload-icon">👤</span>
          )}
        </div>
        <input
          id="profile-pic-input"
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleProfilePic}
        />
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Click to upload profile picture (max 500KB)
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" name="name" className="form-input" placeholder="John Doe" value={form.name} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.5 }} />
          </div>

          <div className="form-group">
            <label className="form-label">Mobile Number</label>
            <input type="tel" name="mobile" className="form-input" placeholder="9876543210" value={form.mobile} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Course</label>
            <input type="text" name="course" className="form-input" placeholder="B.Tech CSE, BCA, MCA..." value={form.course} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">University / College</label>
            <input type="text" name="university" className="form-input" placeholder="Your institution name" value={form.university} onChange={handleChange} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">State</label>
              <input type="text" name="state" className="form-input" placeholder="State" value={form.state} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">District</label>
              <input type="text" name="district" className="form-input" placeholder="District" value={form.district} onChange={handleChange} required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Saving...' : '> Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
