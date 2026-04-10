import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo" onClick={closeMenu}>
        BITRUSION<span>'26</span>
      </Link>

      <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
        <li><a href="/#about" onClick={closeMenu}>About</a></li>
        <li><a href="/#prizes" onClick={closeMenu}>Prizes</a></li>
        <li><a href="/#schedule" onClick={closeMenu}>Schedule</a></li>
        <li><a href="/#faq" onClick={closeMenu}>FAQ</a></li>
        
        {/* Auth buttons moved inside the responsive menu for small screens */}
        <li className="mobile-only-auth">
          <div className="navbar-auth-btns mobile-auth">
            {user ? (
              <>
                <Link to="/dashboard" onClick={closeMenu}>
                  <button className="btn btn-block">Dashboard</button>
                </Link>
                <button className="btn btn-danger btn-block" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={closeMenu}>
                  <button className="btn btn-block">Login</button>
                </Link>
                <Link to="/signup" onClick={closeMenu}>
                  <button className="btn btn-primary btn-block">Register</button>
                </Link>
              </>
            )}
          </div>
        </li>
      </ul>

      <div className="navbar-right">
        {/* Desktop auth buttons */}
        <div className="navbar-auth-btns desktop-auth">
          {user ? (
            <>
              <Link to="/dashboard">
                <button className="btn">Dashboard</button>
              </Link>
              <button className="btn btn-danger" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">
                <button className="btn">Login</button>
              </Link>
              <Link to="/signup">
                <button className="btn btn-primary">Register</button>
              </Link>
            </>
          )}
        </div>

        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}
