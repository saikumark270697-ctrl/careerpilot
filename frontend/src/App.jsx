import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="glass-nav">
          <div className="brand">
            <Rocket size={28} />
            <span className="logo">Career Copilot</span>
          </div>
          <div className="nav-links">
            <Link to="/" className="nav-link">Dashboard</Link>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
