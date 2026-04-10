import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import GlitchText from '../components/GlitchText';

export default function Profile() {
  const { user, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profilePicPreview, setProfilePicPreview] = useState(userProfile?.profilePic || null);

  const [form, setForm] = useState({
    name: userProfile?.name || '',
    mobile: userProfile?.mobile || '',
    course: userProfile?.course || '',
    university: userProfile?.university || '',
    state: userProfile?.state || '',
    district: userProfile?.district || '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleProfilePic = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Profile picture must be under 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name || !form.mobile || !form.course || !form.university || !form.state || !form.district) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...form,
        profilePic: profilePicPreview,
        updatedAt: new Date().toISOString(),
      });
      await refreshProfile();
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError('Failed to update: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-page page-enter">
      <div className="form-container" style={{ maxWidth: '550px' }}>
        <GlitchText text="EDIT PROFILE" tag="h2" className="form-title" />
        <p className="form-subtitle">Update your hacker profile</p>

        {error && <div className="form-error" style={{ textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}
        {success && <div style={{ textAlign: 'center', marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--success)' }}>{success}</div>}

        <div className="profile-pic-upload" onClick={() => document.getElementById('edit-profile-pic').click()}>
          {profilePicPreview ? (
            <img src={profilePicPreview} alt="Profile" />
          ) : (
            <span className="upload-icon">👤</span>
          )}
        </div>
        <input id="edit-profile-pic" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePic} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" name="name" className="form-input" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.5 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Mobile Number</label>
            <input type="tel" name="mobile" className="form-input" value={form.mobile} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Course</label>
            <input type="text" name="course" className="form-input" value={form.course} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">University / College</label>
            <input type="text" name="university" className="form-input" value={form.university} onChange={handleChange} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">State</label>
              <input type="text" name="state" className="form-input" value={form.state} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">District</label>
              <input type="text" name="district" className="form-input" value={form.district} onChange={handleChange} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Saving...' : '> Update Profile'}
          </button>
        </form>

        <button className="btn btn-block" style={{ marginTop: '1rem' }} onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
