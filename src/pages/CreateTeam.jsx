import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import GlitchText from '../components/GlitchText';
import { QRCodeSVG } from 'qrcode.react';

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CodeShastra-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function CreateTeam() {
  const { user, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: choose type, 2: payment, 3: team name, 4: done
  const [teamType, setTeamType] = useState(null); // 'individual' or 'team'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Payment form
  const [utr, setUtr] = useState('');
  const [transactionId, setTransactionId] = useState('');

  // Team name
  const [teamName, setTeamName] = useState('');

  // Result
  const [joinCode, setJoinCode] = useState('');


  const handlePaymentNext = () => {
    setError('');
    if (!utr.trim()) {
      setError('Please enter UTR number');
      return;
    }
    if (!transactionId.trim()) {
      setError('Please enter Transaction ID');
      return;
    }
    setStep(3);
  };

  const handleCompleteRegistration = async () => {
    setError('');
    if (!teamName.trim()) {
      setError('Please enter a team name');
      return;
    }

    setLoading(true);
    try {
      // Check if team name is unique
      const teamQuery = query(
        collection(db, 'teams'),
        where('teamName', '==', teamName.trim())
      );
      const existingTeams = await getDocs(teamQuery);
      if (!existingTeams.empty) {
        setError('Team name already taken. Choose a different name.');
        setLoading(false);
        return;
      }

      const code = teamType === 'team' ? generateJoinCode() : null;
      const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const teamData = {
        teamName: teamName.trim(),
        type: teamType,
        leaderId: user.uid,
        leaderName: userProfile.name,
        leaderEmail: user.email,
        joinCode: code,
        status: teamType === 'individual' ? 'pending' : 'waiting_members',
        utr: utr.trim(),
        transactionId: transactionId.trim(),
        amount: teamType === 'individual' ? 100 : 150,
        members: [user.uid],
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'teams', teamId), teamData);

      // Update user profile with teamId
      await updateDoc(doc(db, 'users', user.uid), {
        teamId: teamId,
        updatedAt: new Date().toISOString(),
      });

      if (code) setJoinCode(code);
      await refreshProfile();
      setStep(4);
    } catch (err) {
      setError('Failed to create team: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-page page-enter">
      <div className="form-container" style={{ maxWidth: '550px' }}>
        {/* Step indicator */}
        <div className="steps">
          <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>1</div>
          <div className={`step-line ${step > 1 ? 'completed' : ''}`} />
          <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>2</div>
          <div className={`step-line ${step > 2 ? 'completed' : ''}`} />
          <div className={`step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>3</div>
          <div className={`step-line ${step > 3 ? 'completed' : ''}`} />
          <div className={`step ${step >= 4 ? 'active' : ''}`}>✓</div>
        </div>

        {error && <div className="form-error" style={{ textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}

        {/* STEP 1: Choose Type */}
        {step === 1 && (
          <>
            <GlitchText text="REGISTRATION TYPE" tag="h2" className="form-title" />
            <p className="form-subtitle">Choose your battle mode</p>
            <div className="dashboard-options" style={{ marginTop: '2rem' }}>
              <div
                className="dashboard-option"
                onClick={() => { setTeamType('individual'); setStep(2); }}
              >
                <div className="dashboard-option-icon">👤</div>
                <div className="dashboard-option-title">Individual</div>
                <div className="dashboard-option-desc">Solo participation — ₹100</div>
              </div>
              <div
                className="dashboard-option"
                onClick={() => { setTeamType('team'); setStep(2); }}
              >
                <div className="dashboard-option-icon">👥</div>
                <div className="dashboard-option-title">Team</div>
                <div className="dashboard-option-desc">Team participation — ₹150</div>
              </div>
            </div>
          </>
        )}

        {/* STEP 2: Payment */}
        {step === 2 && (() => {
          console.log("Current VITE_UPI_ID loaded in app:", import.meta.env.VITE_UPI_ID);
          return (
          <>
            <GlitchText text="PAYMENT" tag="h2" className="form-title" />
            <p className="form-subtitle">
              Pay ₹{teamType === 'individual' ? '100' : '150'} to complete registration
            </p>

            <div style={{ textAlign: 'center', margin: '2rem 0', display: 'flex', justifyContent: 'center' }}>
              <div style={{ padding: '10px', background: '#ffffff', borderRadius: '8px', display: 'inline-block' }}>
                <QRCodeSVG 
                  value={`upi://pay?pa=${import.meta.env.VITE_UPI_ID}&pn=CodeShastra&am=${teamType === 'individual' ? '100.00' : '150.00'}&cu=INR`}
                  size={200}
                  level={"H"}
                />
              </div>
            </div>

            <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--warning)', marginBottom: '1.5rem' }}>
              ₹{teamType === 'individual' ? '100' : '150'} — Scan & Pay
            </p>


            <div className="form-group">
              <label className="form-label">UTR Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter UTR number"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Transaction ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter Transaction ID"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn" onClick={() => { setStep(1); setError(''); }} style={{ flex: 1 }}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={handlePaymentNext} style={{ flex: 2 }}>
                Next →
              </button>
            </div>
          </>
        )})()}

        {/* STEP 3: Team Name */}
        {step === 3 && (
          <>
            <GlitchText text="TEAM NAME" tag="h2" className="form-title" />
            <p className="form-subtitle">Choose a unique name for your {teamType === 'individual' ? 'entry' : 'team'}</p>

            <div className="form-group" style={{ marginTop: '2rem' }}>
              <label className="form-label">Team Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter a unique team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn" onClick={() => { setStep(2); setError(''); }} style={{ flex: 1 }}>
                ← Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCompleteRegistration}
                disabled={loading}
                style={{ flex: 2 }}
              >
                {loading ? 'Creating...' : '> Complete Registration'}
              </button>
            </div>
          </>
        )}

        {/* STEP 4: Done */}
        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <GlitchText text="SUCCESS" tag="h2" className="form-title" />
            <p className="form-subtitle" style={{ marginBottom: '1.5rem' }}>
              {teamType === 'individual'
                ? 'Your registration has been submitted for approval!'
                : 'Your team has been created! Share the code with your members.'}
            </p>

            {joinCode && (
              <div className="cyber-card" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div className="team-info-label">Team Join Code</div>
                <div className="team-info-value" style={{ fontSize: '1.3rem', wordBreak: 'break-all' }}>
                  {joinCode}
                </div>
                <button
                  className="btn"
                  style={{ marginTop: '1rem', fontSize: '0.75rem' }}
                  onClick={() => {
                    navigator.clipboard.writeText(joinCode);
                  }}
                >
                  📋 Copy Code
                </button>
              </div>
            )}

            {teamType === 'team' && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--warning)', marginBottom: '1.5rem' }}>
                ⚠ Share this code with your teammates. Once all members join,
                submit your team from the dashboard for admin approval.
              </p>
            )}

            <button className="btn btn-primary btn-block" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
