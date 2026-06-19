import { useEffect, useState } from 'react';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import CoachDashboard from './components/CoachDashboard';
import ClientDashboard from './components/ClientDashboard';
import { DialogProvider } from './components/ui/Dialog';
import './index.css';

// Restore the logged-in user from localStorage on every full reload so F5 / closing the tab
// / clicking the back-arrow does not kick the user back to the credentials screen. The token
// expiry (1 day on the backend) is still the source of truth for security.
function loadStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function App() {
  const [user, setUserState] = useState(loadStoredUser);

  const setUser = (next) => {
    setUserState(next);
    if (next) localStorage.setItem('user', JSON.stringify(next));
    else localStorage.removeItem('user');
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // If the token is missing but we have a stale user (e.g. cleared cookies), drop the user too
  // so the next render shows the login screen instead of an empty dashboard.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user && !localStorage.getItem('token')) setUser(null);
  }, [user]);

  return (
    <DialogProvider>
      {!user && <Login onLogin={handleLogin} />}
      {user?.role === 'SUPER_ADMIN' && <AdminDashboard user={user} onLogout={handleLogout} />}
      {user?.role === 'COACH' && <CoachDashboard user={user} onLogout={handleLogout} onUserUpdate={setUser} />}
      {user?.role === 'PREMIUM_CLIENT' && <ClientDashboard user={user} onLogout={handleLogout} onUserUpdate={setUser} />}
    </DialogProvider>
  );
}

export default App;
