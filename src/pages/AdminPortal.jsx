import { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import GlitchText from '../components/GlitchText';

import { useAuth } from '../lib/AuthContext';

export default function AdminPortal() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [teams, setTeams] = useState([]);
  const [filter, setFilter] = useState('all');
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState({});
  const [rejectingTeam, setRejectingTeam] = useState(null);
  const [rejectionMessage, setRejectionMessage] = useState('');

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const teamsData = [];
      teamsSnap.forEach((doc) => {
        teamsData.push({ id: doc.id, ...doc.data() });
      });
      teamsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTeams(teamsData);

      const membersMap = {};
      for (const team of teamsData) {
        if (team.members && team.members.length > 0) {
          const membersList = [];
          for (const memberId of team.members) {
            const memberSnap = await getDoc(doc(db, 'users', memberId));
            if (memberSnap.exists()) {
              membersList.push({ id: memberSnap.id, ...memberSnap.data() });
            }
          }
          membersMap[team.id] = membersList;
        }
      }
      setTeamMembers(membersMap);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchTeams();
    }
  }, [isAdmin, fetchTeams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // AuthContext will automatically detect this and set isAdmin
      const adminRef = doc(db, 'admins', cred.user.uid);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        setError('Access denied. You are not an admin.');
        await auth.signOut();
      }
    } catch (err) {
      setError('Login failed: ' + err.message.replace('Firebase: ', '').replace(/\(auth\/.*\)/, ''));
    }
    setLoading(false);
  };

  const handleApprove = async (teamId) => {
    if (!window.confirm('Approve this team?')) return;
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        status: 'approved',
        rejectionMessage: null,
      });
      setTeams(teams.map(t => t.id === teamId ? { ...t, status: 'approved', rejectionMessage: null } : t));
    } catch (err) {
      alert('Failed to approve: ' + err.message);
    }
  };

  const handleRejectStart = (teamId) => {
    setRejectingTeam(teamId);
    setRejectionMessage('');
  };

  const handleRejectConfirm = async () => {
    if (!rejectingTeam) return;
    setLoading(true);
    try {
      const teamToReject = teams.find(t => t.id === rejectingTeam);
      const message = rejectionMessage.trim() || 'No reason provided.';
      const finalMessage = `${message} (For any query reach out at support@codeshastra.tech)`;
      const submissionDate = teamToReject.updatedAt || teamToReject.createdAt;

      // Update team status
      await updateDoc(doc(db, 'teams', rejectingTeam), {
        status: 'rejected',
        rejectionMessage: finalMessage,
      });

      // Notify each member and clear their teamId
      const batch = writeBatch(db);
      const members = teamMembers[rejectingTeam] || [];
      const fullMemberDetails = members.map(m => ({ 
        uid: m.uid, 
        name: m.name, 
        email: m.email,
        mobile: m.mobile,
        university: m.university,
        course: m.course,
        state: m.state,
        district: m.district
      }));

      // Archive team before deletion
      const archiveRef = doc(collection(db, 'team_archives'));
      batch.set(archiveRef, {
        ...teamToReject,
        members: fullMemberDetails,
        archivedAt: new Date().toISOString(),
        archiveReason: 'admin_rejection',
        rejectionReason: message,
        archivedBy: 'admin'
      });

      for (const member of members) {
        // Create notification
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: member.uid,
          type: 'team_rejection',
          teamName: teamToReject.teamName,
          rejectionMessage: finalMessage,
          teamDetails: fullMemberDetails.map(m => ({ name: m.name, email: m.email })),
          submissionDate: submissionDate,
          rejectionDate: new Date().toISOString(),
          read: false,
        });

        // Clear user's teamId
        const userRef = doc(db, 'users', member.uid);
        batch.update(userRef, { teamId: null });
      }

      // Delete the team document to free up the name and join code
      batch.delete(doc(db, 'teams', rejectingTeam));

      await batch.commit();

      setTeams(teams.filter(t => t.id !== rejectingTeam));
      setRejectingTeam(null);
      setRejectionMessage('');
      
      await fetchTeams();
    } catch (err) {
      alert('Failed to reject: ' + err.message);
    }
    setLoading(false);
  };

  const filteredTeams = teams.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const stats = {
    total: teams.length,
    pending: teams.filter(t => t.status === 'pending').length,
    approved: teams.filter(t => t.status === 'approved').length,
    rejected: teams.filter(t => t.status === 'rejected').length,
  };

  // Login screen
  if (!user || !isAdmin) {
    return (
      <div className="auth-page page-enter">
        <div className="form-container">
          <GlitchText text="ADMIN" tag="h2" className="form-title" />
          <p className="form-subtitle">Restricted access. Admin credentials required.</p>

          {error && <div className="form-error" style={{ textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Admin Email</label>
              <input type="email" className="form-input" placeholder="admin@codeshastra.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? (
                <span className="btn-loading"><span className="btn-spinner" /> Authenticating...</span>
              ) : '> Access Admin Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="admin-page page-enter">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Admin Portal</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            CodeShastra | Bitrusion'26
          </p>
        </div>
        <div className="admin-stats">
          <div className="admin-stat">
            <div className="admin-stat-value">{stats.total}</div>
            <div className="admin-stat-label">Total</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-value" style={{ color: 'var(--warning)' }}>{stats.pending}</div>
            <div className="admin-stat-label">Pending</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-value" style={{ color: 'var(--success)' }}>{stats.approved}</div>
            <div className="admin-stat-label">Approved</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-value" style={{ color: 'var(--danger)' }}>{stats.rejected}</div>
            <div className="admin-stat-label">Rejected</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn" onClick={fetchTeams}>↻ Refresh</button>
          <button className="btn btn-danger" onClick={() => { auth.signOut(); setIsAuthenticated(false); }}>
            Logout
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {['all', 'pending', 'waiting_members', 'approved', 'rejected'].map(f => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : ''}`}
              style={{ fontSize: '0.7rem', padding: '0.4rem 1rem' }}
              onClick={() => setFilter(f)}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading && (
          <div className="loading-container" style={{ minHeight: '200px' }}>
            <div className="spinner" />
            <div className="loading-text">Loading teams...</div>
          </div>
        )}


        {/* Team cards */}
        {filteredTeams.map((team) => (
          <div className="admin-team-detail" key={team.id}>
            <div className="admin-team-header">
              <div>
                <h3 className="admin-team-name">{team.teamName}</h3>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {team.type === 'individual' ? '👤 Individual' : '👥 Team'} • ₹{team.amount} • {new Date(team.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className={`status-badge status-${team.status === 'waiting_members' ? 'pending' : team.status}`}>
                  {team.status.replace('_', ' ')}
                </span>
                <div className="admin-actions">
                  {team.status === 'pending' && (
                    <button className="btn btn-primary" style={{ fontSize: '0.7rem', padding: '0.3rem 0.8rem' }}
                      onClick={() => handleApprove(team.id)}>
                      ✓ Approve
                    </button>
                  )}
                  {(team.status === 'pending' || team.status === 'approved') && (
                    <button className="btn btn-danger" style={{ fontSize: '0.7rem', padding: '0.3rem 0.8rem' }}
                      onClick={() => handleRejectStart(team.id)}>
                      ✗ Reject
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Show rejection message if exists */}
            {team.status === 'rejected' && team.rejectionMessage && (
              <div style={{
                margin: '0.5rem 0 1rem', padding: '0.75rem 1rem',
                background: 'rgba(255, 0, 64, 0.05)', border: '1px solid rgba(255, 0, 64, 0.2)',
                borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem'
              }}>
                <span style={{ color: 'var(--danger)' }}>Rejection reason:</span>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>{team.rejectionMessage}</span>
              </div>
            )}

            {/* Team details toggle */}
            <button
              className="btn"
              style={{ fontSize: '0.7rem', padding: '0.3rem 1rem', marginBottom: '1rem' }}
              onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
            >
              {expandedTeam === team.id ? '▾ Hide Details' : '▸ Show Details'}
            </button>

            {expandedTeam === team.id && (
              <div style={{ animation: 'fadeInUp 0.3s ease' }}>
                <div className="team-info-grid">
                  <div className="team-info-item">
                    <div className="team-info-label">Leader</div>
                    <div className="team-info-value" style={{ fontSize: '0.85rem' }}>{team.leaderName}</div>
                  </div>
                  <div className="team-info-item">
                    <div className="team-info-label">Leader Email</div>
                    <div className="team-info-value" style={{ fontSize: '0.85rem' }}>{team.leaderEmail}</div>
                  </div>
                  <div className="team-info-item">
                    <div className="team-info-label">UTR</div>
                    <div className="team-info-value" style={{ fontSize: '0.85rem' }}>{team.utr}</div>
                  </div>
                  <div className="team-info-item">
                    <div className="team-info-label">Transaction ID</div>
                    <div className="team-info-value" style={{ fontSize: '0.85rem' }}>{team.transactionId}</div>
                  </div>
                  {team.joinCode && (
                    <div className="team-info-item">
                      <div className="team-info-label">Join Code</div>
                      <div className="team-info-value" style={{ fontSize: '0.85rem' }}>{team.joinCode}</div>
                    </div>
                  )}
                </div>


                <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                  Members ({teamMembers[team.id]?.length || 0})
                </h4>
                {teamMembers[team.id]?.map((member) => (
                  <div className="member-card" key={member.id}>
                    <div className="member-avatar">
                      {member.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="member-info" style={{ flex: 1 }}>
                      <div className="member-name">{member.name}</div>
                      <div className={`member-role ${member.uid === team.leaderId ? 'leader' : ''}`}>
                        {member.uid === team.leaderId ? '★ Leader' : 'Member'}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                      <div>{member.email}</div>
                      <div>{member.mobile}</div>
                      <div>{member.course}</div>
                      <div>{member.university}</div>
                      <div>{member.state}, {member.district}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredTeams.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
            No teams found for this filter.
          </div>
        )}
      </div>

      {/* Rejection Modal moved to root for better visibility */}
      {rejectingTeam && (
        <div className="image-modal" style={{ position: 'fixed', zIndex: 11000 }} onClick={(e) => { if (e.target === e.currentTarget) setRejectingTeam(null); }}>
          <div className="form-container" style={{ maxWidth: '450px', background: 'var(--bg-dark)', border: '1px solid var(--primary)' }} onClick={(e) => e.stopPropagation()}>
            <GlitchText text="REJECT TEAM" tag="h2" className="form-title" />
            <p className="form-subtitle">Provide a reason for rejection (visible to user)</p>
            <div className="form-group">
              <label className="form-label">Rejection Reason</label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="e.g., Payment screenshot unclear, UTR number invalid..."
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setRejectingTeam(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" style={{ flex: 2 }} onClick={handleRejectConfirm} disabled={loading}>
                {loading ? 'Rejecting...' : '✗ Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
