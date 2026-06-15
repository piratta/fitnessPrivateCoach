import { useState } from 'react';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import CoachDashboard from './components/CoachDashboard';
import ClientDashboard from './components/ClientDashboard';
import { DialogProvider } from './components/ui/Dialog';
import './index.css';

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

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
