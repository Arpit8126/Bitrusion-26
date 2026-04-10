import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import MatrixRain from './components/MatrixRain';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import CreateTeam from './pages/CreateTeam';
import JoinTeam from './pages/JoinTeam';
import Profile from './pages/Profile';
import AdminPortal from './pages/AdminPortal';
import './index.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-wrapper">
          <MatrixRain />
          <div className="scanline-overlay" />
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={
              <ProtectedRoute requireProfile={false}>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/create-team" element={
              <ProtectedRoute>
                <CreateTeam />
              </ProtectedRoute>
            } />
            <Route path="/join-team" element={
              <ProtectedRoute>
                <JoinTeam />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={<AdminPortal />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
