import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Rocket, LogIn, UserPlus, LogOut, ChevronDown, HelpCircle } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import FAQ from './pages/FAQ';
import ForgotPassword from './pages/ForgotPassword';

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); setMenuOpen(false); navigate('/'); };

  return (
    <nav className="glass-nav">
      <Link to="/" className="brand">
        <Rocket size={24} />
        <span className="logo">Career Copilot</span>
      </Link>

      <div className="nav-right">
        <Link to="/" className="nav-link">Dashboard</Link>
        <Link to="/faq" className="nav-link">FAQ</Link>

        {loading ? (
          <div className="nav-skeleton" />
        ) : user ? (
          <div className="nav-user-menu" ref={menuRef}>
            <button className="nav-user-btn" onClick={() => setMenuOpen(v => !v)}>
              <div className="nav-avatar">{user.name.charAt(0).toUpperCase()}</div>
              <span className="nav-user-name">{user.name.split(' ')[0]}</span>
              <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: menuOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
            {menuOpen && (
              <div className="nav-dropdown">
                <div className="nav-dropdown-info">
                  <div className="nav-dropdown-name">{user.name}</div>
                  <div className="nav-dropdown-email">{user.email}</div>
                </div>
                <button className="nav-dropdown-item logout-item" onClick={handleLogout}>
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="nav-auth-btns">
            <Link to="/login" className="nav-login-btn">
              <LogIn size={15} /> Sign In
            </Link>
            <Link to="/signup" className="nav-signup-btn">
              <UserPlus size={15} /> Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Rocket size={17} className="footer-rocket" />
          <span className="footer-name">Career Copilot</span>
        </div>
        <div className="footer-links">
          <Link to="/" className="footer-link">Dashboard</Link>
          <Link to="/faq" className="footer-link">FAQ</Link>
          <Link to="/login" className="footer-link">Sign In</Link>
          <Link to="/signup" className="footer-link">Get Started</Link>
        </div>
        <p className="footer-copy">
          © 2025 Career Copilot · Powered by Groq + Llama 3.3 · Built for job seekers worldwide
        </p>
      </div>
    </footer>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

function AppInner() {
  return (
    <div className="app-container">
      <Nav />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </Router>
  );
}

export default App;
