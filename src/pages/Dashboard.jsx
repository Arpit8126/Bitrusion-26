import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, arrayRemove, writeBatch } from 'firebase/firestore';
import GlitchText from '../components/GlitchText';

export default function Dashboard() {
  const { user, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Recruitment System States
  const [availableTeams, setAvailableTeams] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);

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
          // Team document was deleted or doesn't exist
          setTeam(null);
          // Clean up stale teamId in user profile
          if (userProfile?.teamId) {
            await updateDoc(doc(db, 'users', user.uid), {
              teamId: null,
              updatedAt: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.warn('Failed to fetch team:', err.message);
      }
    } else {
      setTeam(null);
      setTeamMembers([]);
    }
    setLoading(false);
  };

  const fetchRecruitmentData = async () => {
    if (!user) return;
    
    // 1. Fetch available teams (only if user has no team)
    if (!userProfile?.teamId) {
      const q = query(
        collection(db, 'teams'),
        where('status', '==', 'waiting_members'),
        where('type', '==', 'team')
      );
      const snap = await getDocs(q);
      const teamsList = [];
      for (const d of snap.docs) {
        const data = d.data();
        // DOUBLE CHECK: Only show teams with < 4 members and NOT individual teams
        if (data.members.length < 4 && data.type === 'team' && data.status === 'waiting_members') {
          // Fetch leader details
          const leaderSnap = await getDoc(doc(db, 'users', data.leaderId));
          // Fetch members details
          const memsQuery = query(collection(db, 'users'), where('teamId', '==', d.id));
          const memsSnap = await getDocs(memsQuery);
          const mems = memsSnap.docs.map(m => m.data());
          
          teamsList.push({ 
            id: d.id, 
            ...data, 
            leader: leaderSnap.exists() ? leaderSnap.data() : null,
            fullMembers: mems
          });
        }
      }
      setAvailableTeams(teamsList);

      // 2. Fetch my pending requests
      const reqQ = query(
        collection(db, 'join_requests'),
        where('userId', '==', user.uid),
        where('status', '==', 'pending')
      );
      const reqSnap = await getDocs(reqQ);
      setMyRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    }

    // 3. Fetch incoming requests (only if leader)
    if (userProfile?.teamId) {
      const teamSnap = await getDoc(doc(db, 'teams', userProfile.teamId));
      if (teamSnap.exists() && teamSnap.data().leaderId === user.uid) {
        const incQ = query(
          collection(db, 'join_requests'),
          where('teamId', '==', userProfile.teamId),
          where('status', '==', 'pending')
        );
        const incSnap = await getDocs(incQ);
        setIncomingRequests(incSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    }
  };

  useEffect(() => {
    fetchTeam();
    fetchRecruitmentData();
  }, [userProfile]);

  // Leader removes a member
  const handleRemoveMember = async (memberId) => {
    if (team.status !== 'waiting_members') {
      alert('Team is locked. Members cannot be removed after submission.');
      return;
    }
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
    if (team.members && team.members.length < 2) {
      alert('You need at least 2 members (1 leader + 1 member) to submit the team. Share your code to invite members!');
      return;
    }
    if (!window.confirm('Submit your team for admin approval? Make sure all members have joined.')) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'teams', team.id), {
        status: 'pending',
        updatedAt: new Date().toISOString()
      });
      setTeam({ ...team, status: 'pending' });
    } catch (err) {
      alert('Failed to submit team: ' + err.message);
    }
    setActionLoading(false);
  };

  // Member or leader leaves the team
  const handleLeaveTeam = async () => {
    // Re-verify status from DB to prevent stale state issues
    setActionLoading(true);
    try {
      const teamSnap = await getDoc(doc(db, 'teams', team.id));
      const latestStatus = teamSnap.exists() ? teamSnap.data().status : 'deleted';
      
      const isLocked = latestStatus !== 'waiting_members' && latestStatus !== 'rejected' && latestStatus !== 'deleted';
      if (isLocked) {
        alert('Team is locked. Team has been submitted by the team leader so any changes are not acceptable.');
        setActionLoading(false);
        await fetchTeam(); // Refresh UI to lock buttons
        return;
      }

      const isLeader = team.leaderId === user.uid;

      if (isLeader) {
        if (!window.confirm('WARNING: As the Team Leader, if you leave, the team will be DELETED for everyone. Do you want to proceed?')) {
          setActionLoading(false);
          return;
        }

        // Prepare full member details for audit trail
        const batch = writeBatch(db);
        const fullMemberDetails = teamMembers.map(m => ({ 
          uid: m.uid, 
          name: m.name, 
          email: m.email,
          mobile: m.mobile,
          university: m.university,
          course: m.course,
          state: m.state,
          district: m.district
        }));

        const archiveRef = doc(collection(db, 'team_archives'));
        batch.set(archiveRef, {
          ...team,
          members: fullMemberDetails,
          archivedAt: new Date().toISOString(),
          archiveReason: 'leader_left',
          archivedBy: 'leader',
          archivedByUid: user.uid,
          archivedByName: userProfile.name
        });

        // Unlink all members and notify them
        for (const member of teamMembers) {
          // No need to notify the leader who is leaving voluntarily
          if (member.uid !== user.uid) {
            // Create notification for member
            const notifRef = doc(collection(db, 'notifications'));
            batch.set(notifRef, {
              userId: member.uid,
              type: 'team_deleted',
              teamName: team.teamName,
              rejectionMessage: 'Team leader left or deleted the team. (For any query reach out at support@codeshastra.tech)',
              teamDetails: fullMemberDetails.map(m => ({ name: m.name, email: m.email })),
              submissionDate: team.updatedAt || new Date().toISOString(),
              rejectionDate: new Date().toISOString(),
              read: false,
            });

            // Clear member's teamId
            batch.update(doc(db, 'users', member.uid), { teamId: null });
          }
        }

        // Clear leader's own teamId
        batch.update(doc(db, 'users', user.uid), { teamId: null });

        // Delete the team document
        batch.delete(doc(db, 'teams', team.id));

        await batch.commit();
      } else {
        // Regular member leaving
        if (!window.confirm('Are you sure you want to leave this team?')) {
          setActionLoading(false);
          return;
        }

        // Remove from team members array
        await updateDoc(doc(db, 'teams', team.id), {
          members: arrayRemove(user.uid),
        });

        // Update user profile with teamId
        await updateDoc(doc(db, 'users', user.uid), {
          teamId: null,
          updatedAt: new Date().toISOString(),
        });

        // CLEANUP: Delete all pending join requests for this user
        const reqsQ = query(collection(db, 'join_requests'), where('userId', '==', user.uid));
        const reqsSnap = await getDocs(reqsQ);
        if (!reqsSnap.empty) {
          const batch = writeBatch(db);
          reqsSnap.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      }
      
      await refreshProfile();
      setTeam(null);
      setTeamMembers([]);
    } catch (err) {
      alert('Failed to leave team: ' + err.message);
    }
    setActionLoading(false);
  };

  const handleSendRequest = async (targetTeam) => {
    if (myRequests.length >= 3) {
      alert('You can only have 3 pending requests at a time. Cancel one to apply elsewhere.');
      return;
    }
    setActionLoading(true);
    try {
      const reqRef = doc(collection(db, 'join_requests'));
      await setDoc(reqRef, {
        userId: user.uid,
        teamId: targetTeam.id,
        teamName: targetTeam.teamName,
        leaderId: targetTeam.leaderId,
        status: 'pending',
        timestamp: new Date().toISOString(),
        applicantDetails: {
          name: userProfile.name || 'Anonymous',
          email: userProfile.email || user.email,
          gender: userProfile.gender || 'N/A',
          university: userProfile.university || 'N/A',
          course: userProfile.course || 'N/A',
          location: (userProfile.district && userProfile.state) 
            ? `${userProfile.district}, ${userProfile.state}` 
            : 'N/A'
        }
      });
      await fetchRecruitmentData();
      alert('Request sent successfully!');
    } catch (err) {
      alert('Failed to send request: ' + err.message);
    }
    setActionLoading(false);
  };

  const handleCancelRequest = async (requestId) => {
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, 'join_requests', requestId));
      await fetchRecruitmentData();
    } catch (err) {
      alert('Failed to cancel request: ' + err.message);
    }
    setActionLoading(false);
  };

  const handleApproveRequest = async (request) => {
    setActionLoading(true);
    try {
      const teamRef = doc(db, 'teams', team.id);
      const teamSnap = await getDoc(teamRef);
      const currentMembers = teamSnap.data().members || [];
      
      if (currentMembers.length >= 4) {
        alert('Team is already full (Max 4).');
        setActionLoading(false);
        return;
      }

      const batch = writeBatch(db);
      
      // 1. Add to team
      batch.update(teamRef, {
        members: [...currentMembers, request.userId]
      });

      // 2. Link user
      batch.update(doc(db, 'users', request.userId), {
        teamId: team.id,
        updatedAt: new Date().toISOString()
      });

      // 3. Delete ALL pending requests for this user
      const userReqsQ = query(collection(db, 'join_requests'), where('userId', '==', request.userId));
      const userReqsSnap = await getDocs(userReqsQ);
      userReqsSnap.forEach(d => batch.delete(d.ref));

      await batch.commit();
      await fetchTeam();
      await fetchRecruitmentData();
      alert('Member approved and joined!');
    } catch (err) {
      alert('Failed to approve: ' + err.message);
    }
    setActionLoading(false);
  };

  const handleRejectRequest = async (request) => {
    if (!window.confirm('Reject this joining request?')) return;
    setActionLoading(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Delete request
      batch.delete(doc(db, 'join_requests', request.id));
      
      // 2. Create notification
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        userId: request.userId,
        type: 'join_rejected',
        teamName: team.teamName,
        rejectionMessage: `Your request to join ${team.teamName} is rejected.`,
        submissionDate: request.timestamp || new Date().toISOString(),
        rejectionDate: new Date().toISOString(),
        teamDetails: teamMembers.map(m => ({ name: m.name, email: m.email })),
        read: false
      });

      await batch.commit();
      await fetchRecruitmentData();
    } catch (err) {
      alert('Failed to reject: ' + err.message);
    }
    setActionLoading(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(team.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          {team.status === 'approved' && (
            <a
              href="https://chat.whatsapp.com/HnOFr2q9rd4LeuXH3dIWpM?mode=gi_t"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ marginTop: '1rem', background: '#25D366', color: '#000', borderColor: '#25D366', display: 'inline-block' }}
            >
              💬 Join Official WhatsApp Group
            </a>
          )}
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
                  {team.status === 'waiting_members' ? 'Team not submitted' : team.status}
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
                    style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem', marginLeft: '0.5rem', position: 'relative' }}
                    onClick={handleCopyCode}
                  >
                    {copied ? '✅ COPIED!' : '📋'}
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
                {member.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="member-info">
                <div className="member-name">{member.name}</div>
                <div className={`member-role ${member.uid === team.leaderId ? 'leader' : ''}`}>
                  {member.uid === team.leaderId ? '★ Leader' : 'Member'}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'right', flex: 1, paddingRight: '1rem' }}>
                <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{member.email}</div>
                <div>{member.gender || 'N/A'} • {member.course}</div>
                <div>{member.university}</div>
              </div>
              {isLeader && member.uid !== team.leaderId && team.status === 'waiting_members' && (
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

          {/* Incoming Join Requests (Leader only) */}
          {isLeader && team.status === 'waiting_members' && incomingRequests.length > 0 && (
             <div style={{ marginTop: '3rem' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)', fontSize: '1rem', letterSpacing: '2px', marginBottom: '1.5rem', textTransform: 'uppercase' }}>
                   ⚡ Incoming Joining Requests ({incomingRequests.length})
                </h3>
                {incomingRequests.map(req => (
                  <div className="member-card" key={req.id} style={{ borderLeft: '4px solid var(--accent)', background: 'rgba(0, 229, 255, 0.05)' }}>
                    <div className="member-info" style={{ flex: 2 }}>
                      <div className="member-name">{req.applicantDetails.name} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>({req.applicantDetails.gender})</span></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>{req.applicantDetails.email}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {req.applicantDetails.course} @ {req.applicantDetails.university}
                      </div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>📍 {req.applicantDetails.location}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary" style={{ fontSize: '0.7rem' }} onClick={() => handleApproveRequest(req)} disabled={actionLoading}>
                        Approve
                      </button>
                      <button className="btn btn-danger" style={{ fontSize: '0.7rem' }} onClick={() => handleRejectRequest(req)} disabled={actionLoading}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          )}

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

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
              className="btn"
              onClick={() => navigate('/profile')}
            >
              Edit Profile
            </button>
            
            {/* Allow members to leave if not locked */}
            {(team.status === 'waiting_members' || team.status === 'rejected') && (
              <button
                className="btn btn-danger"
                onClick={handleLeaveTeam}
                disabled={actionLoading}
              >
                {actionLoading ? 'Leaving...' : 'Leave Team'}
              </button>
            )}
          </div>
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

        {/* Recruitment Board for Solo Users */}
        <div style={{ marginTop: '4rem' }}>
           <GlitchText text="FIND YOUR SQUAD" tag="h2" className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }} />
           <p className="section-subtitle" style={{ marginBottom: '2rem' }}>Recruiting teams looking for fellow hackers.</p>
           
           {/* My Current Requests */}
           {myRequests.length > 0 && (
             <div style={{ marginBottom: '3rem' }}>
                <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--warning)', letterSpacing: '2px', marginBottom: '1rem' }}>
                   PENDING REQUESTS ({myRequests.length}/3)
                </h4>
                {myRequests.map(req => (
                  <div className="member-card" key={req.id} style={{ borderColor: 'var(--warning)', background: 'rgba(255, 170, 0, 0.05)' }}>
                    <div className="member-info">
                      <div className="member-name">{req.teamName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Waiting for leader approval...</div>
                    </div>
                    <button className="btn btn-danger" style={{ fontSize: '0.7rem' }} onClick={() => handleCancelRequest(req.id)} disabled={actionLoading}>
                      Cancel Request
                    </button>
                  </div>
                ))}
             </div>
           )}

           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))', gap: '1.5rem' }}>
             {availableTeams.length === 0 ? (
               <div className="notification-empty" style={{ gridColumn: '1/-1', background: 'rgba(255,255,255,0.02)' }}>
                  No recruiting teams found. Check back later or create your own!
               </div>
             ) : (
               availableTeams.map(t => (
                 <div key={t.id} className="cyber-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                       <h3 style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>{t.teamName}</h3>
                       <div style={{ background: 'rgba(0, 255, 65, 0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--primary)' }}>
                          {t.members.length}/4 Members
                       </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                       <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Team Leader</div>
                       <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <div className="member-avatar" style={{ width: '35px', height: '35px', fontSize: '1rem' }}>{t.leader?.name?.charAt(0)}</div>
                          <div>
                             <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t.leader?.name} <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({t.leader?.gender})</span></div>
                             <div style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{t.leader?.email}</div>
                             <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t.leader?.course} @ {t.leader?.university}</div>
                          </div>
                       </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                       <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Current Members</div>
                       <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {t.fullMembers.map(m => (
                             <div key={m.uid} style={{ fontSize: '0.8rem', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {m.name}
                             </div>
                          ))}
                       </div>
                    </div>

                    <button 
                       className="btn btn-primary btn-block" 
                       onClick={() => handleSendRequest(t)} 
                       disabled={actionLoading || myRequests.some(r => r.teamId === t.id)}
                    >
                       {myRequests.some(r => r.teamId === t.id) ? 'Request Sent' : '> Send Join Request'}
                    </button>
                 </div>
               ))
             )}
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
