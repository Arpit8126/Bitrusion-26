import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, arrayRemove } from 'firebase/firestore';
import GlitchText from '../components/GlitchText';

export default function Dashboard() {
  const { user, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTeam = async () => {
    if (userProfile?.teamId) {
      try {
        const teamRef = doc(db, 'teams', userProfile.teamId);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
          setTeam({ id: teamSnap.id, ...teamSnap.data() });

          // Fetch team members
          const membersQuery = query(
            collection(db, 'users'),
            where('teamId', '==', userProfile.teamId)
          );
          const membersSnap = await getDocs(membersQuery);
          const members = [];
          membersSnap.forEach((d) => {
            members.push({ id: d.id, ...d.data() });
          });
          setTeamMembers(members);
        } else {
          // Team document was deleted
          setTeam(null);
        }
      } catch (err) {
        console.warn('Failed to fetch team:', err.message);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTeam();
  }, [userProfile]);

  // Leader removes a member
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the team?')) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'teams', team.id), {
        members: arrayRemove(memberId),
      });
      await updateDoc(doc(db, 'users', memberId), {
        teamId: null,
        updatedAt: new Date().toISOString(),
      });
      await fetchTeam();
    } catch (err) {
      alert('Failed to remove member: ' + err.message);
    }
    setActionLoading(false);
  };

  // Leader submits team for admin approval
  const handleSubmitTeam = async () => {
    if (!window.confirm('Submit your team for admin approval? Make sure all members have joined.')) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'teams', team.id), {
        status: 'pending',
      });
      setTeam({ ...team, status: 'pending' });
    } catch (err) {
      alert('Failed to submit team: ' + err.message);
    }
    setActionLoading(false);
  };

  // Leave rejected team to try again
  const handleLeaveTeam = async () => {
    if (!window.confirm('Leave this team and register again?')) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        teamId: null,
        updatedAt: new Date().toISOString(),
      });
      await refreshProfile();
      setTeam(null);
      setTeamMembers([]);
    } catch (err) {
      alert('Failed to leave team: ' + err.message);
    }
    setActionLoading(false);
  };

  const isLeader = team && user && team.leaderId === user.uid;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <div className="loading-text">Loading Dashboard...</div>
      </div>
    );
  }

  // If user has a team, show team dashboard
  if (team) {
    return (
      <div className="dashboard-page page-enter">
        <div className="dashboard-header">
          <div className="dashboard-welcome">Welcome back, hacker</div>
          <div className="dashboard-name">{userProfile?.name}</div>
          <a 
            href="https://chat.whatsapp.com/HnOFr2q9rd4LeuXH3dlWpM?mode=gi_t" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn"
            style={{ marginTop: '1rem', background: '#25D366', color: '#000', borderColor: '#25D366', display: 'inline-block' }}
          >
            💬 Join Official WhatsApp Group
          </a>
        </div>
        <div className="dashboard-content">
          <GlitchText text="TEAM DASHBOARD" tag="h2" className="section-title" style={{ marginBottom: '2rem' }} />

          <div className="team-info-grid">
            <div className="team-info-item">
              <div className="team-info-label">Team Name</div>
              <div className="team-info-value">{team.teamName}</div>
            </div>
            <div className="team-info-item">
              <div className="team-info-label">Type</div>
              <div className="team-info-value">{team.type === 'individual' ? 'Individual' : 'Team'}</div>
            </div>
            <div className="team-info-item">
              <div className="team-info-label">Status</div>
              <div className="team-info-value">
                <span className={`status-badge status-${team.status === 'waiting_members' ? 'pending' : team.status}`}>
                  {team.status === 'waiting_members' ? 'Waiting for Members' : team.status}
                </span>
              </div>
            </div>
            {team.joinCode && (
              <div className="team-info-item">
                <div className="team-info-label">Join Code</div>
                <div className="team-info-value" style={{ fontSize: '0.85rem' }}>
                  {team.joinCode}
                  <button
                    className="btn"
                    style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem', marginLeft: '0.5rem' }}
                    onClick={() => navigator.clipboard.writeText(team.joinCode)}
                  >
                    📋
                  </button>
                </div>
              </div>
            )}
          </div>

          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)', fontSize: '1rem', letterSpacing: '2px', marginBottom: '1rem', textTransform: 'uppercase' }}>
            Team Members ({teamMembers.length})
          </h3>

          {teamMembers.map((member) => (
            <div className="member-card" key={member.id}>
              <div className="member-avatar">
                {member.profilePic ? (
                  <img src={member.profilePic} alt={member.name} />
                ) : (
                  member.name?.charAt(0)?.toUpperCase()
                )}
              </div>
              <div className="member-info">
                <div className="member-name">{member.name}</div>
                <div className={`member-role ${member.uid === team.leaderId ? 'leader' : ''}`}>
                  {member.uid === team.leaderId ? '★ Leader' : 'Member'}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'right', flex: 1 }}>
                <div>{member.university}</div>
                <div>{member.course}</div>
              </div>
              {isLeader && member.uid !== team.leaderId && team.status !== 'approved' && (
                <button
                  className="btn btn-danger"
                  style={{ fontSize: '0.65rem', padding: '0.3rem 0.6rem', marginLeft: '0.5rem' }}
                  onClick={() => handleRemoveMember(member.uid)}
                  disabled={actionLoading}
                >
                  ✗ Remove
                </button>
              )}
            </div>
          ))}

          {/* Leader: Submit Team for Approval (when status is waiting_members) */}
          {isLeader && team.status === 'waiting_members' && (
            <div className="cyber-card" style={{ marginTop: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
              <p className="cyber-card-title">Ready to Submit?</p>
              <p className="cyber-card-text" style={{ marginBottom: '1rem' }}>
                Once all your team members have joined, submit your team for admin approval.
                Share the join code: <strong style={{ color: 'var(--primary)' }}>{team.joinCode}</strong>
              </p>
              <button
                className="btn btn-primary"
                onClick={handleSubmitTeam}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <span className="btn-loading"><span className="btn-spinner" /> Submitting...</span>
                ) : '> Submit Team for Approval'}
              </button>
            </div>
          )}

          {team.status === 'pending' && (
            <div className="cyber-card" style={{ marginTop: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              <p className="cyber-card-title">Approval Pending</p>
              <p className="cyber-card-text">
                Your registration is under review by the CodeShastra team.
                You will be notified once approved.
              </p>
            </div>
          )}

          {team.status === 'approved' && (
            <div className="cyber-card" style={{ marginTop: '2rem', textAlign: 'center', borderColor: 'var(--success)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <p className="cyber-card-title" style={{ color: 'var(--success)' }}>Registration Approved!</p>
              <p className="cyber-card-text">
                Welcome to Bitrusion'26! You're officially in. Stay tuned for updates.
              </p>
            </div>
          )}

          {team.status === 'rejected' && (
            <div className="cyber-card" style={{ marginTop: '2rem', textAlign: 'center', borderColor: 'var(--danger)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❌</div>
              <p className="cyber-card-title" style={{ color: 'var(--danger)' }}>Registration Rejected</p>
              {team.rejectionMessage && (
                <div style={{
                  margin: '1rem auto', maxWidth: '500px', padding: '1rem',
                  background: 'rgba(255, 0, 64, 0.05)', border: '1px solid rgba(255, 0, 64, 0.2)',
                  borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-primary)'
                }}>
                  <div style={{ color: 'var(--danger)', fontSize: '0.7rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                    Reason from Admin:
                  </div>
                  {team.rejectionMessage}
                </div>
              )}
              <p className="cyber-card-text" style={{ marginTop: '1rem' }}>
                You can leave this team and register again with corrected details.
              </p>
              <button
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
                onClick={handleLeaveTeam}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <span className="btn-loading"><span className="btn-spinner" /> Processing...</span>
                ) : '> Leave Team & Register Again'}
              </button>
            </div>
          )}

          <button
            className="btn"
            style={{ marginTop: '2rem' }}
            onClick={() => navigate('/profile')}
          >
            Edit Profile
          </button>
        </div>
      </div>
    );
  }

  // No team - show options
  return (
    <div className="dashboard-page page-enter">
      <div className="dashboard-header">
        <div className="dashboard-welcome">Welcome, hacker</div>
        <div className="dashboard-name">{userProfile?.name}</div>
        <a 
          href="https://chat.whatsapp.com/HnOFr2q9rd4LeuXH3dlWpM?mode=gi_t" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn"
          style={{ marginTop: '1rem', background: '#25D366', color: '#000', borderColor: '#25D366', display: 'inline-block' }}
        >
          💬 Join Official WhatsApp Group
        </a>
      </div>
      <div className="dashboard-content">
        <div className="section-header">
          <GlitchText text="GET STARTED" tag="h2" className="section-title" />
          <div className="section-divider" />
          <p className="section-subtitle">Choose your path. Register for Bitrusion'26.</p>
        </div>

        <div className="dashboard-options">
          <div className="dashboard-option" onClick={() => navigate('/create-team')}>
            <div className="dashboard-option-icon">🚀</div>
            <div className="dashboard-option-title">Create Team</div>
            <div className="dashboard-option-desc">
              Register as individual (₹100) or create a team (₹150)
            </div>
          </div>
          <div className="dashboard-option" onClick={() => navigate('/join-team')}>
            <div className="dashboard-option-icon">🔗</div>
            <div className="dashboard-option-title">Join Team</div>
            <div className="dashboard-option-desc">
              Enter a team code to join an existing team
            </div>
          </div>
        </div>

        <button
          className="btn"
          style={{ marginTop: '3rem' }}
          onClick={() => navigate('/profile')}
        >
          Edit Profile
        </button>
      </div>
    </div>
  );
}
