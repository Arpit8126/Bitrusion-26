import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import GlitchText from '../components/GlitchText';

export default function JoinTeam() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [teamName, setTeamName] = useState('');

  const handleJoin = async () => {
    setError('');
    if (!joinCode.trim()) {
      setError('Please enter a team code');
      return;
    }

    setLoading(true);
    try {
      // Find team by join code
      const teamQuery = query(
        collection(db, 'teams'),
        where('joinCode', '==', joinCode.trim())
      );
      const teamSnap = await getDocs(teamQuery);

      if (teamSnap.empty) {
        setError('Invalid team code. No team found with this code.');
        setLoading(false);
        return;
      }

      const teamDoc = teamSnap.docs[0];
      const teamData = teamDoc.data();

      // Check if team is full (max 4 members)
      if (teamData.members && teamData.members.length >= 4) {
        setError('This team is already full (maximum 4 members).');
        setLoading(false);
        return;
      }

      // Check if user is already in this team
      if (teamData.members && teamData.members.includes(user.uid)) {
        setError('You are already a member of this team.');
        setLoading(false);
        return;
      }

      // Add user to team
      await updateDoc(doc(db, 'teams', teamDoc.id), {
        members: arrayUnion(user.uid),
      });

      // Update user's teamId
      await updateDoc(doc(db, 'users', user.uid), {
        teamId: teamDoc.id,
        updatedAt: new Date().toISOString(),
      });

      setTeamName(teamData.teamName);
      setSuccess(true);
      await refreshProfile();
    } catch (err) {
      setError('Failed to join team: ' + err.message);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="auth-page page-enter">
        <div className="form-container" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎯</div>
          <GlitchText text="JOINED" tag="h2" className="form-title" />
          <p className="form-subtitle" style={{ marginBottom: '1.5rem' }}>
            You have successfully joined team <strong style={{ color: 'var(--primary)' }}>{teamName}</strong>!
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Check your dashboard to see team details and approval status.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page page-enter">
      <div className="form-container">
        <GlitchText text="JOIN TEAM" tag="h2" className="form-title" />
        <p className="form-subtitle">Enter the team code shared by your team leader</p>

        {error && <div className="form-error" style={{ textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}

        <div className="form-group" style={{ marginTop: '2rem' }}>
          <label className="form-label">Team Code</label>
          <input
            type="text"
            className="form-input"
            placeholder="CodeShastra-XXXXXXXX"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            style={{ textAlign: 'center', fontSize: '1.1rem', letterSpacing: '2px' }}
          />
        </div>

        <button
          className="btn btn-primary btn-block"
          onClick={handleJoin}
          disabled={loading}
          style={{ marginTop: '1rem' }}
        >
          {loading ? 'Joining...' : '> Join Team'}
        </button>

        <button
          className="btn btn-block"
          onClick={() => navigate('/dashboard')}
          style={{ marginTop: '1rem' }}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
