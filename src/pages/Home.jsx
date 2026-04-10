import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GlitchText from '../components/GlitchText';
import { useAuth } from '../lib/AuthContext';

const typingTexts = [
  '> Initializing hackathon protocol...',
  '> Deploying innovation framework...',
  '> Hacking the future, one line at a time...',
  '> Access granted. Welcome, hacker.',
  '> System breach detected: creativity overflow...',
];

function TypingEffect() {
  const [textIndex, setTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const currentText = typingTexts[textIndex];
    if (charIndex < currentText.length) {
      const timeout = setTimeout(() => {
        setDisplayText(currentText.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, 40 + Math.random() * 40);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setCharIndex(0);
        setDisplayText('');
        setTextIndex((textIndex + 1) % typingTexts.length);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [charIndex, textIndex]);

  return <div className="hero-typing">{displayText}</div>;
}

function CountUp({ target, duration = 2000 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <>{count.toLocaleString()}</>;
}

export default function Home() {
  const { user } = useAuth();
  const [visible, setVisible] = useState({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.section').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="page-enter">
      {/* ========== HERO ========== */}
      <section className="hero">
        <div className="hero-badge">⚡ CodeShastra Presents</div>
        <GlitchText text="BITRUSION'26" className="hero-title" />
        <p className="hero-subtitle">
          The ultimate 24-hour completely online hackathon meeting innovation and disruption.
          25-26 April 2026. Hack the impossible.
        </p>
        <TypingEffect />
        <div className="hero-buttons">
          {user ? (
            <Link to="/dashboard">
              <button className="btn btn-primary btn-large">Dashboard</button>
            </Link>
          ) : (
            <Link to="/signup">
              <button className="btn btn-primary btn-large">Register Now</button>
            </Link>
          )}
          <a href="#home">
            <button className="btn btn-large">Learn More</button>
          </a>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-value"><CountUp target={24} /></div>
            <div className="hero-stat-label">Hours</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">₹<CountUp target={15000} />+</div>
            <div className="hero-stat-label">Prize Pool</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value"><CountUp target={4} /></div>
            <div className="hero-stat-label">Battle Rounds</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value"><CountUp target={10} />+</div>
            <div className="hero-stat-label">Themes</div>
          </div>
        </div>
      </section>

      {/* ========== HOME (ABOUT) ========== */}
      <section className={`section ${visible['home'] ? 'page-enter' : ''}`} id="home">
        <div className="section-header">
          <GlitchText text="THE HACKATHON" tag="h2" className="section-title" />
          <div className="section-divider" />
          <p className="section-subtitle">
            A 24-hour completely online battlefield. April 25-26, 2026. Open for university students globally.
          </p>
        </div>
        <div className="grid-3">
          <div className="cyber-card">
            <div className="cyber-card-icon">🌐</div>
            <h3 className="cyber-card-title">100% Online</h3>
            <p className="cyber-card-text">
              Participate from anywhere in India or across the globe. We provide the infrastructure, 
              you provide the genius. Build the future without geographical limits.
            </p>
          </div>
          <div className="cyber-card">
            <div className="cyber-card-icon">🧠</div>
            <h3 className="cyber-card-title">Multiple Themes</h3>
            <p className="cyber-card-text">
              Conquer domains in AI/ML, Cybersecurity, WebDev, Health Care, Finance, App Dev, 
              Open Innovation, Sustainability & Development, Agriculture, and more!
            </p>
          </div>
          <div className="cyber-card">
            <div className="cyber-card-icon">🕵️</div>
            <h3 className="cyber-card-title">Secret Statements</h3>
            <p className="cyber-card-text">
              The exact problem statements will remain classified until the hackathon officially launches.
              Adapt quickly to survive the disruption.
            </p>
          </div>
        </div>
      </section>

      {/* ========== BATTLE ROUNDS ========== */}
      <section className={`section ${visible['eval'] ? 'page-enter' : ''}`} id="eval" style={{ marginTop: '2rem' }}>
        <div className="section-header">
          <GlitchText text="EVALUATION ROUNDS" tag="h2" className="section-title" />
          <div className="section-divider" />
          <p className="section-subtitle">Points table (Leaderboard) updated after every round for a true and fair competition.</p>
        </div>
        <div className="timeline">
          <div className="timeline-item">
            <div className="timeline-content">
              <div className="timeline-date">20 Points</div>
              <h4 className="timeline-title">1. PPT Round</h4>
              <p className="timeline-desc">
                Teams have 10 minutes to present online to the judges. Time slots and meet links will be shared in your 
                WhatsApp group and dashboard. (All members must join the WhatsApp group!)
              </p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-content">
              <div className="timeline-date">30 Points</div>
              <h4 className="timeline-title">2. Tech Evaluation Round</h4>
              <p className="timeline-desc">
                After the PPT round, you'll get time to build your project. We check Code Complexity, UI/UX, 
                Feasibility, and Innovation. Time slots shared in WhatsApp and Dashboard.
              </p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-content">
              <div className="timeline-date">10 Points</div>
              <h4 className="timeline-title">3. The Leader Quiz</h4>
              <p className="timeline-desc">
                During the hackathon, we host two workshops based on Git and Deployments. 
                Following these, a quiz will test your knowledge. Only the Team Leader gives this quiz!
              </p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-content">
              <div className="timeline-date">40 Points</div>
              <h4 className="timeline-title">4. Bug Bounty Round (Final)</h4>
              <p className="timeline-desc">
                Projects of every team will be shuffled and randomly distributed! Your team will receive a new shuffled project 
                in your dashboard. You must redesign it, add features, change UI/UX or business perspective, and present the changes to the judges!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== PRIZES ========== */}
      <section className={`section ${visible['prizes'] ? 'page-enter' : ''}`} id="prizes">
        <div className="section-header">
          <GlitchText text="PRIZES" tag="h2" className="section-title" />
          <div className="section-divider" />
          <p className="section-subtitle">A ₹15,000 Prize Pool up for grabs (can increase with time).</p>
        </div>
        <div className="grid-3">
          <div className="cyber-card prize-card">
            <div className="prize-rank silver">2ND</div>
            <div className="prize-amount">₹5,000</div>
            <div className="prize-label">Runner Up</div>
          </div>
          <div className="cyber-card prize-card first">
            <div className="prize-rank gold">1ST</div>
            <div className="prize-amount">₹8,000</div>
            <div className="prize-label">Champion</div>
          </div>
          <div className="cyber-card prize-card">
            <div className="prize-rank bronze">3RD</div>
            <div className="prize-amount">₹2,000</div>
            <div className="prize-label">Second Runner Up</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginTop: '3rem' }}>
          <div className="cyber-card" style={{ textAlign: 'center' }}>
            <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>4th & 5th Positions</h4>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Premium Goodies + Certificate of Appreciation.</p>
          </div>
          <div className="cyber-card" style={{ textAlign: 'center' }}>
            <h4 style={{ color: 'var(--success)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>All Participants</h4>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Positions 1-5 get Certificate of Appreciation.<br/>Rest get Soft Copy of Certificate of Participation.</p>
          </div>
        </div>
      </section>

      {/* ========== SCHEDULE & WORKSHOPS ========== */}
      <section className={`section ${visible['schedule'] ? 'page-enter' : ''}`} id="schedule">
        <div className="section-header">
          <GlitchText text="SCHEDULE" tag="h2" className="section-title" />
          <div className="section-divider" />
          <p className="section-subtitle">25-26 April 2026. Non-stop online action.</p>
        </div>
        <div className="timeline">
          <div className="timeline-item">
            <div className="timeline-content">
              <div className="timeline-date">Phase 01</div>
              <h4 className="timeline-title">Registration Opens</h4>
              <p className="timeline-desc">
                Sign up, form your team, and prepare. Join the official WhatsApp group for critical team slots and meeting link updates.
              </p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-content">
              <div className="timeline-date">Phase 02</div>
              <h4 className="timeline-title">Themes Reveal & Kickoff</h4>
              <p className="timeline-desc">
                Hackathon officially starts! Problem statements released exclusively on this website.
              </p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-content">
              <div className="timeline-date">Phase 03</div>
              <h4 className="timeline-title">Hacking & Workshops</h4>
              <p className="timeline-desc">
                Code building begins. Attend the Git and Deployments workshops during the hackathon—your score depends on it!
              </p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-content">
              <div className="timeline-date">Phase 04</div>
              <h4 className="timeline-title">Battle Rounds Execution</h4>
              <p className="timeline-desc">
                PPT presentations, Tech Evaluation, the Leader Quiz, and finally the chaotic Bug Bounty project-swap round!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CONTACT US ========== */}
      <section className={`section ${visible['contact'] ? 'page-enter' : ''}`} id="contact">
        <div className="section-header">
          <GlitchText text="SUPPORT HUB" tag="h2" className="section-title" />
          <div className="section-divider" />
          <p className="section-subtitle">Stuck in the matrix? Reach out to us.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          <div className="cyber-card" style={{ textAlign: 'center' }}>
            <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Email</h4>
            <a href="mailto:support@codeshastra.tech" style={{ color: '#fff', textDecoration: 'none', fontSize: '0.95rem' }}>
              support@codeshastra.tech
            </a>
          </div>
          <div className="cyber-card" style={{ textAlign: 'center' }}>
            <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Hackathon Coordinators</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              First drop a WhatsApp message; if delayed, drop a call.<br/><br/>
              <strong style={{ color: '#fff' }}>Rishabh Mishra:</strong> 9105280131
              <a href="https://www.linkedin.com/in/rishabh-mishra-bab420309/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', marginLeft: '8px', verticalAlign: 'middle', display: 'inline-flex', paddingBottom: '2px' }} title="Rishabh Mishra LinkedIn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              </a><br/>
              <strong style={{ color: '#fff' }}>Arpit Pandey:</strong> 8395036720
              <a href="https://www.linkedin.com/in/arpit-pandey-9b3a23312/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', marginLeft: '8px', verticalAlign: 'middle', display: 'inline-flex', paddingBottom: '2px' }} title="Arpit Pandey LinkedIn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section className={`section ${visible['faq'] ? 'page-enter' : ''}`} id="faq" style={{ marginTop: '5rem' }}>
        <div className="section-header">
          <GlitchText text="FAQ" tag="h2" className="section-title" />
          <div className="section-divider" />
          <p className="section-subtitle">Got questions? We have answers.</p>
        </div>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {[
            { q: 'Who can participate?', a: 'Any university student from India and outside of India can participate. Both individual and team registrations are accepted.' },
            { q: 'What is the team size?', a: 'Teams can have 2-4 members. You can also register as an individual participant.' },
            { q: 'Is there a registration fee?', a: 'Yes. ₹100 for individual participation and ₹150 for team participation (for the entire team, which only the Team Leader pays at once during team creation).' },
            { q: 'What do I need to bring?', a: 'Just a laptop, your creativity, and an unstoppable will to hack. Everything else, we handle.' },
            { q: 'Will there be mentors?', a: 'Yes! Industry mentors will be available throughout the hackathon to guide and help teams.' },
          ].map((faq, i) => (
            <FaqItem key={i} question={faq.q} answer={faq.a} index={i} />
          ))}
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="footer">
        <div className="footer-brand">BITRUSION'26</div>
        <p className="footer-text">A CodeShastra Initiative</p>
        <div className="footer-links" style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
          <a href="https://www.codeshastra.tech" target="_blank" rel="noopener noreferrer" title="Website" style={{ color: 'var(--text-secondary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          </a>
          <a href="https://www.instagram.com/code___shastra?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" title="Instagram" style={{ color: 'var(--text-secondary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
          </a>
          <a href="https://www.linkedin.com/company/code-shastra/posts/?feedView=all" target="_blank" rel="noopener noreferrer" title="LinkedIn" style={{ color: 'var(--text-secondary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
          </a>
          <a href="https://www.youtube.com/@CodeShastra-w9d" target="_blank" rel="noopener noreferrer" title="YouTube" style={{ color: 'var(--text-secondary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
          </a>
        </div>
        <p className="footer-text">© 2026 CodeShastra. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FaqItem({ question, answer, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="cyber-card"
      style={{
        marginBottom: '1rem',
        cursor: 'pointer',
        animationDelay: `${index * 0.1}s`,
      }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 className="cyber-card-title" style={{ fontSize: '0.9rem', marginBottom: 0 }}>
          {question}
        </h4>
        <span style={{ color: 'var(--primary)', fontSize: '1.2rem', transition: 'transform 0.3s', transform: open ? 'rotate(45deg)' : 'rotate(0)' }}>
          +
        </span>
      </div>
      {open && (
        <p className="cyber-card-text" style={{ marginTop: '1rem' }}>
          {answer}
        </p>
      )}
    </div>
  );
}
