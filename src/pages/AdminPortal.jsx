import { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import GlitchText from '../components/GlitchText';

import { useAuth } from '../lib/AuthContext';

export default function AdminPortal() {
  const { user, isAdmin, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [teams, setTeams] = useState([]);
  const [archivedTeams, setArchivedTeams] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [viewMode, setViewMode] = useState('teams'); // 'teams', 'users', 'participating', 'archives'
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [archiveSearchTerm, setArchiveSearchTerm] = useState('');
  
  // New Search & Filter States for Users
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [participatingSearchTerm, setParticipatingSearchTerm] = useState('');
  const [filterUni, setFilterUni] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState({});
  const [rejectingTeam, setRejectingTeam] = useState(null);
  const [rejectionMessage, setRejectionMessage] = useState('');

  const fetchArchives = useCallback(async () => {
    try {
      const archiveSnap = await getDocs(collection(db, 'team_archives'));
      const archiveData = [];
      archiveSnap.forEach(doc => archiveData.push({ id: doc.id, ...doc.data() }));
      archiveData.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
      setArchivedTeams(archiveData);
    } catch (err) {
      console.error('Failed to fetch archives:', err);
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = [];
      usersSnap.forEach(doc => usersData.push({ id: doc.id, ...doc.data() }));
      setAllUsers(usersData);
    } catch (err) {
      console.error('Failed to fetch all users:', err);
    }
  }, []);

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
      await fetchArchives();
      await fetchAllUsers();
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
    setLoading(false);
  }, [fetchArchives, fetchAllUsers]);

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
    const search = searchTerm.toLowerCase();
    const matchesSearch = t.teamName.toLowerCase().includes(search) ||
      t.leaderEmail.toLowerCase().includes(search);
    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const soloUsers = allUsers.filter(u => !u.teamId && u.uid !== user?.uid).filter(u => {
    const search = userSearchTerm.toLowerCase();
    const uni = filterUni.toLowerCase();
    const year = filterYear.toLowerCase();
    const loc = filterLocation.toLowerCase();

    const matchesSearch = u.name?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search);
    const matchesUni = !uni || u.university?.toLowerCase().includes(uni);
    const matchesYear = !year || u.yearOfStudy?.toLowerCase().includes(year);
    const matchesLoc = !loc || u.district?.toLowerCase().includes(loc) || u.state?.toLowerCase().includes(loc);

    return matchesSearch && matchesUni && matchesYear && matchesLoc;
  });

  const participatingUsers = allUsers.filter(u => u.teamId && u.uid !== user?.uid).map(u => {
    const team = teams.find(t => t.id === u.teamId);
    return {
      ...u,
      teamName: team?.teamName || 'N/A',
      teamLeaderId: team?.leaderId || 'N/A',
      teamLeaderName: team?.leaderName || 'N/A'
    };
  }).filter(u => {
    const search = participatingSearchTerm.toLowerCase();
    const uni = filterUni.toLowerCase();
    const year = filterYear.toLowerCase();
    const loc = filterLocation.toLowerCase();

    const matchesSearch = u.name?.toLowerCase().includes(search) || 
                          u.email?.toLowerCase().includes(search) || 
                          u.teamName?.toLowerCase().includes(search);
                          
    const matchesUni = !uni || u.university?.toLowerCase().includes(uni);
    const matchesYear = !year || u.yearOfStudy?.toLowerCase().includes(year);
    const matchesLoc = !loc || u.district?.toLowerCase().includes(loc) || u.state?.toLowerCase().includes(loc);

    return matchesSearch && matchesUni && matchesYear && matchesLoc;
  });

  const filteredArchives = archivedTeams.filter(t => {
    const search = archiveSearchTerm.toLowerCase();
    return t.teamName.toLowerCase().includes(search) ||
      t.leaderEmail.toLowerCase().includes(search);
  });

  const stats = {
    total: teams.length,
    pending: teams.filter(t => t.status === 'pending').length,
    approved: teams.filter(t => t.status === 'approved').length,
    solo: soloUsers.length,
    archived: archivedTeams.length
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
            <div className="admin-stat-label">Total Teams</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-value" style={{ color: 'var(--warning)' }}>{stats.pending}</div>
            <div className="admin-stat-label">Pending Approval</div>
          </div>
          <div className="admin-stat" style={{ cursor: 'pointer' }} onClick={() => setViewMode('users')}>
            <div className="admin-stat-value" style={{ color: 'var(--accent)' }}>{stats.solo}</div>
            <div className="admin-stat-label">Solo Users</div>
          </div>
          <div className="admin-stat" style={{ cursor: 'pointer' }} onClick={() => setViewMode('archives')}>
            <div className="admin-stat-value" style={{ color: 'var(--primary)' }}>{stats.archived}</div>
            <div className="admin-stat-label">Archives</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button className="cyber-btn-premium" onClick={fetchTeams}>
            <span style={{ marginRight: '5px' }}>↻</span> REFRESH
          </button>
          <button className="cyber-btn-premium" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={logout}>
            LOGOUT
          </button>
        </div>
      </div>

      <div className="admin-content" style={{ padding: '0 2rem 2rem 2rem' }}>
        {/* View Mode Switcher */}
        <div className="admin-dash-card" style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}>
          <button
            className={`cyber-tab-premium ${viewMode === 'teams' ? 'active' : ''}`}
            onClick={() => setViewMode('teams')}
          >
            Teams Dashboard
          </button>
          <button
            className={`cyber-tab-premium ${viewMode === 'users' ? 'active' : ''}`}
            onClick={() => setViewMode('users')}
          >
            User Registry
          </button>
          <button
            className={`cyber-tab-premium ${viewMode === 'participating' ? 'active' : ''}`}
            onClick={() => setViewMode('participating')}
          >
            Participating Users
          </button>
          <button
            className={`cyber-tab-premium ${viewMode === 'archives' ? 'active' : ''}`}
            onClick={() => setViewMode('archives')}
          >
            Archive Vault
          </button>
        </div>

        {/* Local Filter for Teams */}
        {viewMode === 'teams' && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap', paddingLeft: '0.5rem' }}>
            {['all', 'pending', 'waiting_members', 'approved'].map(f => (
              <button
                key={f}
                className={`cyber-btn-premium ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}

        {/* Search & Filters for Users (Solo and Participating) */}
        {(viewMode === 'users' || viewMode === 'participating') && (
          <div className="admin-dash-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
               {/* Contextual Search */}
               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label className="form-label" style={{ fontSize: '0.65rem' }}>Search {viewMode === 'users' ? 'Registered' : 'Participating'} Users</label>
                 <input 
                   type="text" 
                   className="cyber-input-premium" 
                   placeholder={viewMode === 'users' ? "Name or Email..." : "Name, Email or Team Name..."}
                   value={viewMode === 'users' ? userSearchTerm : participatingSearchTerm}
                   onChange={(e) => viewMode === 'users' ? setUserSearchTerm(e.target.value) : setParticipatingSearchTerm(e.target.value)}
                 />
               </div>

               {/* University Filter */}
               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label className="form-label" style={{ fontSize: '0.65rem' }}>Filter by University Name</label>
                 <input 
                   type="text" 
                   className="cyber-input-premium" 
                   placeholder="Institution..."
                   value={filterUni}
                   onChange={(e) => setFilterUni(e.target.value)}
                 />
               </div>

               {/* Year Filter */}
               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label className="form-label" style={{ fontSize: '0.65rem' }}>Filter by Year</label>
                 <input 
                   type="text" 
                   className="cyber-input-premium" 
                   placeholder="1st, 2nd, etc..."
                   value={filterYear}
                   onChange={(e) => setFilterYear(e.target.value)}
                 />
               </div>

               {/* Location Filter */}
               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label className="form-label" style={{ fontSize: '0.65rem' }}>Filter by Location</label>
                 <input 
                   type="text" 
                   className="cyber-input-premium" 
                   placeholder="District or State..."
                   value={filterLocation}
                   onChange={(e) => setFilterLocation(e.target.value)}
                 />
               </div>
            </div>
          </div>
        )}

        {/* Search for Archives */}
        {viewMode === 'archives' && (
          <div className="admin-dash-card" style={{ marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Vault Search:
            </div>
            <input
              type="text"
              placeholder="Enter Team Name or Leader Email..."
              className="cyber-input-premium"
              style={{ flex: 1, maxWidth: '500px' }}
              value={archiveSearchTerm}
              onChange={(e) => setArchiveSearchTerm(e.target.value)}
            />
          </div>
        )}

        {/* Search for Teams */}
        {viewMode === 'teams' && (
          <div style={{ marginBottom: '2.5rem', maxWidth: '500px', paddingLeft: '0.5rem' }}>
            <input
              type="text"
              placeholder="Search active teams or leaders..."
              className="cyber-input-premium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        {loading && (
          <div className="loading-container" style={{ minHeight: '200px' }}>
            <div className="spinner" />
            <div className="loading-text">Loading teams...</div>
          </div>
        )}


        {/* Teams Dashboard View */}
        {viewMode === 'teams' && filteredTeams.map((team) => (
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
                    <button className="cyber-btn-premium" style={{ fontSize: '0.65rem', padding: '0.3rem 0.6rem' }}
                      onClick={() => handleApprove(team.id)}>
                      ✓ Approve
                    </button>
                  )}
                  {(team.status === 'pending' || team.status === 'approved') && (
                    <button className="cyber-btn-premium" style={{ fontSize: '0.65rem', padding: '0.3rem 0.6rem', borderColor: 'var(--danger)', color: 'var(--danger)', marginLeft: '5px' }}
                      onClick={() => handleRejectStart(team.id)}>
                      ✗ Reject
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Team details toggle */}
            <button
              className="cyber-btn-premium"
              style={{ fontSize: '0.65rem', padding: '0.2rem 0.75rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.02)' }}
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

        {/* Solo Users View */}
        {viewMode === 'users' && (
          <>
            <div className="admin-dash-card" style={{ marginBottom: '1.5rem', padding: '1rem', borderLeft: '4px solid var(--accent)' }}>
               <p style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.5px' }}>
                 ℹ️ This is the list of users who registered in the website but didn't create any team nor joined any team.
               </p>
            </div>
            {soloUsers.length === 0 ? (
              <div className="notification-empty" style={{ background: 'rgba(0,0,0,0.1)' }}>No unaffiliated users found.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {soloUsers.map((u) => (
                  <div key={u.uid} className="admin-team-detail" style={{ background: 'rgba(0,255,100,0.02)', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                      <div className="member-avatar" style={{ width: '50px', height: '50px', fontSize: '1.2rem' }}>
                        {u.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '4px' }}>{u.name}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.email}</p>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Mobile:</span><br /> {u.mobile || 'N/A'}
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Course:</span><br /> {u.course || 'N/A'}
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>University Name:</span><br /> {u.university || 'N/A'}
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Year of Study:</span><br /> {u.yearOfStudy || 'N/A'}
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Location:</span><br /> {u.district}, {u.state}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Participating Users View */}
        {viewMode === 'participating' && (
          participatingUsers.length === 0 ? (
            <div className="notification-empty" style={{ background: 'rgba(0,0,0,0.1)' }}>No participating users found.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
              {participatingUsers.map((u) => (
                <div key={u.uid} className="admin-team-detail" style={{ background: 'rgba(0,229,255,0.02)', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div className="member-avatar" style={{ width: '50px', height: '50px', fontSize: '1.2rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                      {u.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {u.name} {u.uid === u.teamLeaderId && (
                          <span style={{ fontSize: '0.65rem', background: 'var(--accent)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            (LEADER)
                          </span>
                        )}
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.email} • {u.mobile || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="admin-dash-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      <div>
                        <span style={{ color: 'rgba(0,229,255,0.5)' }}>TEAM NAME:</span><br /> {u.teamName}
                      </div>
                      <div>
                        <span style={{ color: 'rgba(0,229,255,0.5)' }}>UNIQUE TEAM ID:</span><br /> <span style={{ fontSize: '0.65rem' }}>{u.teamId}</span>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'rgba(0,229,255,0.5)' }}>LEADER NAME:</span><br /> {u.teamLeaderName}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Course:</span><br /> {u.course || 'N/A'}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Year of Study:</span><br /> {u.yearOfStudy || 'N/A'}
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>University Name:</span><br /> {u.university || 'N/A'}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Location:</span><br /> {u.district}, {u.state}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Archive Vault View */}
        {viewMode === 'archives' && (
          filteredArchives.length === 0 ? (
            <div className="notification-empty" style={{ background: 'rgba(0,0,0,0.1)' }}>No archived records found matching your search.</div>
          ) : (
            filteredArchives.map((team) => (
              <div className="admin-team-detail" key={team.id} style={{ opacity: 0.85, borderLeft: '4px solid var(--text-secondary)' }}>
                <div className="admin-team-header">
                  <div>
                    <h3 className="admin-team-name">{team.teamName} <span style={{ fontSize: '0.7rem', color: 'var(--warning)', letterSpacing: '1px' }}>(VAULT RECORD)</span></h3>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Archived on {new Date(team.archivedAt).toLocaleString()} • {team.archiveReason?.toUpperCase() || 'MANUAL ARCHIVE'}
                    </span>
                  </div>
                  <button
                    className="cyber-btn-premium"
                    style={{ fontSize: '0.65rem', padding: '0.3rem 0.8rem' }}
                    onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                  >
                    {expandedTeam === team.id ? 'Hide Record' : 'View Audit Details'}
                  </button>
                </div>

                {expandedTeam === team.id && (
                  <div style={{ animation: 'fadeInUp 0.3s ease', marginTop: '1.5rem' }}>
                    <div className="team-info-grid" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '4px' }}>
                      <div className="team-info-item">
                        <div className="team-info-label">Leader</div>
                        <div className="team-info-value">{team.leaderName}</div>
                      </div>
                      <div className="team-info-item">
                        <div className="team-info-label">Leader Email</div>
                        <div className="team-info-value">{team.leaderEmail}</div>
                      </div>
                      <div className="team-info-item">
                        <div className="team-info-label">Rejection Reason</div>
                        <div className="team-info-value" style={{ color: 'var(--danger)' }}>{team.rejectionReason || 'N/A'}</div>
                      </div>
                      <div className="team-info-item">
                        <div className="team-info-label">Historical UTR</div>
                        <div className="team-info-value">{team.utr}</div>
                      </div>
                    </div>

                    <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '1rem 0', textTransform: 'uppercase' }}>
                      Archive Roster ({team.members?.length || 0})
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                      {team.members?.map((member, idx) => (
                        <div key={idx} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{member.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{member.email}</div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{member.university}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )
        )}

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
