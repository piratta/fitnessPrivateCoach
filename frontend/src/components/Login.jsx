import { useState } from 'react';
import { API_BASE_URL } from '../config';
import '../index.css';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // States for password change on first use
  const [mustChange, setMustChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempUser, setTempUser] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password })
      });

      if (!response.ok) {
        throw new Error('Credenciales inválidas');
      }

      const data = await response.json();
      localStorage.setItem('token', data.accessToken);

      if (data.user.mustChangePassword) {
        // Force password change before accessing dashboard
        setTempUser(data.user);
        setMustChange(true);
      } else {
        onLogin(data.user);
      }
    } catch (err) {
      setError('Credenciales inválidas. Verifica tu correo y contraseña.');
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 4) {
      setError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      if (!response.ok) {
        throw new Error('Error al cambiar contraseña');
      }

      // Password changed, login completely
      onLogin({ ...tempUser, mustChangePassword: false });
    } catch (err) {
      setError('Hubo un problema al actualizar la contraseña. Reinténtalo.');
    }
  };

  if (mustChange) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '420px', padding: '40px 30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              🔒 Primer Inicio de Sesión
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Por seguridad, debes cambiar la contraseña por defecto antes de continuar.
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(255, 69, 0, 0.1)', color: '#ff4500', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(255, 69, 0, 0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Nueva Contraseña
              </label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="Mínimo 4 caracteres" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Confirmar Nueva Contraseña
              </label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="Repite la contraseña" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
              Actualizar Contraseña y Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '420px', padding: '40px 30px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            PRVT<span style={{ color: 'var(--accent-primary)' }}>FITNESS</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Ingresa al panel de administración</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(255, 69, 0, 0.1)', color: '#ff4500', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(255, 69, 0, 0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Usuario / Email
            </label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Ej. antonio o carlos" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Contraseña
            </label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
            Entrar al Sistema
          </button>
        </form>
      </div>
    </div>
  );
}
