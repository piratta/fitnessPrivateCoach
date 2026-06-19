import '../index.css';

export default function AdminDashboard({ user, onLogout }) {
  return (
    <div className="fade-in" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <header className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', marginBottom: '40px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>
            PANEL <span style={{ color: 'var(--accent-primary)' }}>MAESTRO</span>
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontWeight: '600', fontSize: '1rem' }}>{user.name}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{user.role}</p>
          </div>
          <button 
            onClick={onLogout}
            style={{ background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: '600', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            Salir
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        
        <div className="glass-panel" style={{ padding: '25px', borderTop: '3px solid var(--accent-primary)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Usuarios Activos</p>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '800' }}>-</h3>
        </div>
        
        <div className="glass-panel" style={{ padding: '25px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Entrenadores</p>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '800' }}>-</h3>
        </div>

        <div className="glass-panel" style={{ padding: '25px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Sesiones Hoy</p>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '800' }}>-</h3>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="glass-panel" style={{ padding: '30px', minHeight: '400px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>Actividad Reciente</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Sin actividad reciente.</p>
        </div>
      </div>

    </div>
  );
}
