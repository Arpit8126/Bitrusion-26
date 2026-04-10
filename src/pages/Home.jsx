import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GlitchText from '../components/GlitchText';

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
          The ultimate national-level hackathon where innovation meets disruption.
          48 hours. One mission. Hack the impossible.
        </p>
        <TypingEffect />
        <div className="hero-buttons">
          <Link to="/signup">
            <button className="btn btn-primary btn-large">Register Now</button>
          </Link>
          <a href="#about">
            <button className="btn btn-large">Learn More</button>
          </a>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-value"><CountUp target={500} /></div>
            <div className="hero-stat-label">Participants</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">₹<CountUp target={50000} /></div>
            <div className="hero-stat-label">Prize Pool</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value"><CountUp target={48} /></div>
            <div className="hero-stat-label">Hours</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value"><CountUp target={10} /></div>
            <div className="hero-stat-label">Themes</div>
          </div>
        </div>
      </section>

      {/* ========== ABOUT ========== */}
      <section className={`section ${visible['about'] ? 'page-enter' : ''}`} id="about">
        <div className="section-header">
          <GlitchText text="ABOUT" tag="h2" className="section-title" />
          <div className="section-divider" />
          <p className="section-subtitle">
            Decode the challenge. Build the solution. Own the future.
          </p>
        </div>
        <div className="grid-3">
          <div className="cyber-card">
            <div className="cyber-card-icon">🧠</div>
            <h3 className="cyber-card-title">Innovate</h3>
            <p className="cyber-card-text">
              Push the boundaries of technology. Build solutions that disrupt industries
              and challenge the status quo. From AI to blockchain, the stage is yours.
            </p>
          </div>
          <div className="cyber-card">
            <div className="cyber-card-icon">⚡</div>
            <h3 className="cyber-card-title">Collaborate</h3>
            <p className="cyber-card-text">
              Team up with brilliant minds from across the nation. Together you will
              architect, code, and deploy solutions under the pressure of a 48-hour sprint.
            </p>
          </div>
          <div className="cyber-card">
            <div className="cyber-card-icon">🏆</div>
            <h3 className="cyber-card-title">Compete</h3>
            <p className="cyber-card-text">
              Battle for glory and massive prizes. Present your hack before industry judges
              and walk away with recognition, rewards, and invaluable connections.
            </p>
          </div>
        </div>
      </section>

      {/* ========== PRIZES ========== */}
      <section className={`section ${visible['prizes'] ? 'page-enter' : ''}`} id="prizes">
        <div className="section-header">
          <GlitchText text="PRIZES" tag="h2" className="section-title" />
          <div className="section-divider" />
          <p className="section-subtitle">Glory awaits the worthy. Cash prizes for the top hackers.</p>
        </div>
        <div className="grid-3">
          <div className="cyber-card prize-card">
            <div className="prize-rank silver">2ND</div>
            <div className="prize-amount">₹15,000</div>
            <div className="prize-label">Runner Up</div>
          </div>
          <div className="cyber-card prize-card first">
            <div className="prize-rank gold">1ST</div>
            <div className="prize-amount">₹25,000</div>
            <div className="prize-label">Champion</div>
          </div>
          <div className="cyber-card prize-card">
            <div className="prize-rank bronze">3RD</div>
            <div className="prize-amount">₹10,000</div>
            <div className="prize-label">Second Runner Up</div>
          </div>
        </div>
      </section>

      {/* ========== SCHEDULE ========== */}
      <section className={`section ${visible['schedule'] ? 'page-enter' : ''}`} id="schedule">
        <div className="section-header">
          <GlitchText text="SCHEDULE" tag="h2" className="section-title" />
          <div className="section-divider" />
          <p className="section-subtitle">Mark your calendar. The countdown begins.</p>
        </div>
        <div className="timeline">
          <div className="timeline-item">
            <div className="timeline-content">
              <div className="timeline-date">Phase 01</div>
              <h4 className="timeline-title">Registration Opens</h4>
              <p className="timeline-desc">
                Sign up, form your team, and prepare your weapons.
                Early birds get exclusive perks.
              </p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-content">
              <div className="timeline-date">Phase 02</div>
              <h4 className="timeline-title">Opening Ceremony</h4>
              <p className="timeline-desc">
                Kickoff with keynote speakers, theme reveal,
                and the official hackathon countdown begins.
              </p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-content">
              <div className="timeline-date">Phase 03</div>
              <h4 className="timeline-title">Hacking Begins</h4>
              <p className="timeline-desc">
                48 hours of non-stop coding, mentorship sessions,
                and mini-challenges to keep the energy high.
              </p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-content">
              <div className="timeline-date">Phase 04</div>
              <h4 className="timeline-title">Submission & Judging</h4>
              <p className="timeline-desc">
                Submit your projects. Present to judges. The best
                hacks will be crowned and rewarded.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section className={`section ${visible['faq'] ? 'page-enter' : ''}`} id="faq">
        <div className="section-header">
          <GlitchText text="FAQ" tag="h2" className="section-title" />
          <div className="section-divider" />
          <p className="section-subtitle">Got questions? We have answers.</p>
        </div>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {[
            { q: 'Who can participate?', a: 'Any student from any university or college across India can participate. Both individual and team registrations are accepted.' },
            { q: 'What is the team size?', a: 'Teams can have 2-4 members. You can also register as an individual participant.' },
            { q: 'Is there a registration fee?', a: 'Yes. ₹100 for individual registration and ₹200 for team registration (entire team).' },
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
        <div className="footer-links">
          <a href="#about">About</a>
          <a href="#prizes">Prizes</a>
          <a href="#schedule">Schedule</a>
          <a href="#faq">FAQ</a>
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
