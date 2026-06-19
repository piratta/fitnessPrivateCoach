import { useEffect, useState } from 'react';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import CoachDashboard from './components/CoachDashboard';
import ClientDashboard from './components/ClientDashboard';
      {user?.role === 'PREMIUM_CLIENT' && <ClientDashboard user={user} onLogout={handleLogout} onUserUpdate={setUser} />}
    </DialogProvider>
  );
}

export default App;
