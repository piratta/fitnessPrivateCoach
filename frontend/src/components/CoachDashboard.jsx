import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ClientList from './ClientList';
import WorkoutBuilder from './WorkoutBuilder';
import ReviewManager from './ReviewManager';
import TemplateManager from './TemplateManager';
import BillingManager from './BillingManager';
import ExercisesManager from './ExercisesManager';
import { initChatIfEmpty, connectWebSocket, disconnectWebSocket } from '../utils/chatStore';
import { useDialog } from './ui/Dialog';
import { API_BASE_URL } from '../config';
import '../index.css';

export default function CoachDashboard({ user, onLogout, onUserUpdate }) {
  const dialog = useDialog();
  const [activeTab, setActiveTab] = useState('resumen');
  const [templateMode, setTemplateMode] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [workoutClient, setWorkoutClient] = useState('');
  
  // Profile Editor State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    lastName: user.lastName || '',
    birthDate: user.birthDate || '',
    email: user.email || ''
  });

  useEffect(() => {
    setProfileForm({
      name: user.name || '',
      lastName: user.lastName || '',
      birthDate: user.birthDate || '',
      email: user.email || ''
    });
  }, [user]);


  const [templates, setTemplates] = useState([]);

  // Fetch templates from backend database
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_BASE_URL}/api/templates`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.ok ? res.json() : [])
    .then(data => setTemplates(data))
    .catch(err => console.error("Error loading templates:", err));
  }, []);


  const [billingPlans, setBillingPlans] = useState([
    { id: 'bp1', name: 'Mensual', months: 1 },
    { id: 'bp2', name: 'Trimestral', months: 3 },
    { id: 'bp3', name: 'Semestral', months: 6 },
    { id: 'bp4', name: 'Anual', months: 12 }
  ]);

  const [clients, setClients] = useState([]);

  // Fetch clients from backend database
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE_URL}/api/users/clients`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (res.ok) return res.json();
      return [];
    })
    .then(data => {
      // Computes the upcoming payment date by stepping the creation date forward by the plan
      // duration until it lands in the future. Keeps the table populated for clients that the
      // backend does not (yet) track billing for.
      const computeNextPayment = (createdAt, planId) => {
        const plan = billingPlans.find(p => p.id === planId) || billingPlans[0];
        const months = plan?.months || 1;
        const base = createdAt ? new Date(createdAt) : new Date();
        const now = new Date();
        const date = new Date(base);
        let guard = 0;
        while (date <= now && guard < 240) {
          date.setMonth(date.getMonth() + months);
          guard++;
        }
        return date.toISOString().split('T')[0];
      };
      const formattedClients = data.map(u => {
        const billingPlanId = u.billingPlanId || 'bp1';
        return {
          id: u.id,
          name: u.name,
          lastName: u.lastName || '',
          email: u.email,
          username: u.username,
          status: u.status || 'undefined',
          goal: u.goal || 'No definida',
          billingPlanId,
          nextPaymentDate: computeNextPayment(u.createdAt, billingPlanId),

          messages: [],
          routineJson: u.routineJson,
          routine: u.routineJson ? JSON.parse(u.routineJson) : null,
          progressionStrategy: u.progressionStrategy || 'No definida',
          reviewFrequency: u.reviewFrequency || 'Semanal'
        };
      });
      setClients(formattedClients);
    })
    .catch(err => console.error("Error loading clients:", err));
  }, []);

  // Connect to WebSocket and receive live messages globally
  useEffect(() => {
    if (!user?.email) return;

    const handleWsMessage = (message) => {
      const clientEmail = message.clientEmail;
      const text = message.text;

      setClients(prev => {
        const clientObj = prev.find(c => c.email === clientEmail);
        const clientName = clientObj ? clientObj.name.split(' ')[0] : 'Cliente';

        if (message.sender === 'client') {
          if (window.activeChatEmail !== clientEmail) {
            // Show toast notification
            dialog.toast(`Nuevo mensaje de ${clientName}: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`, { variant: 'info' });
            return prev.map(c =>
              c.email === clientEmail
                ? {
                    ...c,
                    unreadMessages: (c.unreadMessages || 0) + 1,
                    messages: [...(c.messages || []), { sender: message.sender, text: message.text, time: message.time }]
                  }
                : c
            );
          } else {
            return prev.map(c => {
              if (c.email === clientEmail) {
                const isDuplicate = (c.messages || []).some(m => m.text === message.text && m.time === message.time && m.sender === message.sender);
                if (isDuplicate) return c;
                return { ...c, messages: [...(c.messages || []), { sender: message.sender, text: message.text, time: message.time }] };
              }
              return c;
            });
          }
        } else if (message.sender === 'coach') {
          return prev.map(c => {
            if (c.email === clientEmail) {
              const isDuplicate = (c.messages || []).some(m => m.text === message.text && m.time === message.time && m.sender === message.sender);
              if (isDuplicate) return c;
              return { ...c, messages: [...(c.messages || []), { sender: message.sender, text: message.text, time: message.time }] };
            }
            return c;
          });
        }
        return prev;
      });
    };

    connectWebSocket(handleWsMessage);

    return () => {
      disconnectWebSocket(handleWsMessage);
    };
  }, [user?.email, dialog]);

  const totalUnread = clients.reduce((acc, c) => acc + (c.unreadMessages || 0), 0);
  const pendingReviews = clients.filter(c => c.nextReview === 'Pendiente' || c.nextReview === 'Hoy').length;

  const navItemStyle = (tabId) => ({
    padding: '10px 20px',
    cursor: 'pointer',
    background: activeTab === tabId ? 'rgba(224, 248, 0, 0.1)' : 'transparent',
    color: activeTab === tabId ? 'var(--accent-primary)' : 'var(--text-main)',
    borderBottom: activeTab === tabId ? '2px solid var(--accent-primary)' : '2px solid transparent',
    fontWeight: activeTab === tabId ? '800' : '600',
    transition: 'all 0.3s',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontSize: '0.9rem'
  });

  return (
    <div className="fade-in" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <header className="glass-panel mobile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>
            ENTRENADOR <span style={{ color: 'var(--accent-primary)' }}>PRO</span>
          </h2>
        </div>
        <div className="mobile-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div onClick={() => setShowProfileModal(true)} style={{ textAlign: 'right', cursor: 'pointer' }} title="Editar mi perfil">
            <p style={{ fontWeight: '600', fontSize: '1rem', textDecoration: 'underline' }}>{user.name}</p>
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

      {/* Navegación de Pestañas */}
      <div className="scrollable-tabs" style={{ marginBottom: '30px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={navItemStyle('resumen')} onClick={() => setActiveTab('resumen')}>Resumen</div>
        <div style={navItemStyle('clientes')} onClick={() => setActiveTab('clientes')}>Mis Clientes</div>
        <div style={navItemStyle('mensajes')} onClick={() => setActiveTab('mensajes')}>
          Mensajes
          {totalUnread > 0 && <span className="fade-in" style={{ background: '#ff4500', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', marginLeft: '8px', fontWeight: 'bold' }}>{totalUnread}</span>}
        </div>
        <div style={navItemStyle('rutinas')} onClick={() => setActiveTab('rutinas')}>Asignar Rutina</div>
        <div style={navItemStyle('plantillas')} onClick={() => setActiveTab('plantillas')}>Mis Plantillas</div>
        <div style={navItemStyle('ejercicios')} onClick={() => setActiveTab('ejercicios')}>Ejercicios</div>
        <div style={navItemStyle('revisiones')} onClick={() => setActiveTab('revisiones')}>
          Revisiones 
          {pendingReviews > 0 && <span style={{ background: '#ff4500', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', marginLeft: '8px', fontWeight: 'bold' }}>{pendingReviews}</span>}
        </div>
        <div style={navItemStyle('facturacion')} onClick={() => setActiveTab('facturacion')}>Facturación</div>
      </div>

      {/* Contenido Dinámico */}
      <div className="fade-in">
        {activeTab === 'resumen' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '25px', borderTop: '3px solid var(--accent-primary)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Clientes Activos</p>
              <h3 style={{ fontSize: '2.5rem', fontWeight: '800' }}>{clients.filter(c => c.status === 'Activo').length}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '25px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Revisiones Pendientes</p>
              <h3 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ff4500' }}>{pendingReviews}</h3>
            </div>
            <div className="glass-panel" style={{ padding: '25px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Mensajes Nuevos</p>
              <h3 style={{ fontSize: '2.5rem', fontWeight: '800' }}>{totalUnread}</h3>
            </div>
          </div>
        )}

        {activeTab === 'clientes' && <ClientList clients={clients} setClients={setClients} billingPlans={billingPlans} onPlanRoutine={(client) => {
          if (client) setWorkoutClient(`${client.name} ${client.lastName || ''}`.trim());
          setActiveTab('rutinas');
          setTemplateMode(false);
        }} />}
        {activeTab === 'mensajes' && <ClientList clients={clients} setClients={setClients} isChatMode={true} />}
        {activeTab === 'rutinas' && <WorkoutBuilder clients={clients} templates={templates} isTemplateMode={templateMode} editingTemplate={editingTemplate} initialClient={workoutClient} setClients={setClients} setTemplates={setTemplates} setActiveTab={setActiveTab} />}
        {activeTab === 'plantillas' && <TemplateManager 
            templates={templates} 
            setTemplates={setTemplates} 
            onCreateNew={() => {
              setTemplateMode(true);
              setEditingTemplate(null);
              setActiveTab('rutinas');
            }}
            onEditTemplate={(t) => {
              setTemplateMode(true);
              setEditingTemplate(t);
              setActiveTab('rutinas');
            }}
          />}
        {activeTab === 'ejercicios' && <ExercisesManager />}
        {activeTab === 'revisiones' && <ReviewManager clients={clients} setClients={setClients} />}
        {activeTab === 'facturacion' && <BillingManager clients={clients} setClients={setClients} billingPlans={billingPlans} setBillingPlans={setBillingPlans} />}
      </div>

      {/* Modal Perfil del Entrenador */}
      {showProfileModal && createPortal(
        <div className="fade-in" onClick={() => setShowProfileModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)',
          zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="glass-panel" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', background: 'rgba(20, 20, 24, 0.98)', padding: '30px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
              <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)', fontWeight: '800' }}>Mi Perfil</h3>
              <button onClick={() => setShowProfileModal(false)} style={{ background: 'transparent', border: 'none', color: '#ff4500', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!profileForm.name.trim() || !profileForm.email.trim()) {
                await dialog.alert("El nombre y el correo electrónico son obligatorios.", { title: "Campos vacíos" });
                return;
              }
              const token = localStorage.getItem('token');
              try {
                const res = await fetch(`${API_BASE_URL}/api/users/me`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    name: profileForm.name,
                    lastName: profileForm.lastName,
                    birthDate: profileForm.birthDate,
                    email: profileForm.email
                  })
                });
                if (res.ok) {
                  const updatedUser = await res.json();
                  if (onUserUpdate) onUserUpdate(updatedUser);
                  dialog.toast("Perfil actualizado con éxito", { variant: 'success' });
                  setShowProfileModal(false);
                } else {
                  const errText = await res.text();
                  await dialog.alert("Error al actualizar perfil: " + errText, { title: "Error" });
                }
              } catch (err) {
                await dialog.alert("Error de red al actualizar perfil.", { title: "Error" });
              }
            }} style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Nombre</label>
                <input type="text" className="input-field" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} style={{ marginBottom: 0 }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Apellidos</label>
                <input type="text" className="input-field" value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })} style={{ marginBottom: 0 }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Fecha de Nacimiento</label>
                <input type="date" className="input-field" value={profileForm.birthDate} onChange={e => setProfileForm({ ...profileForm, birthDate: e.target.value })} style={{ marginBottom: 0, colorScheme: 'dark' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Email</label>
                <input type="email" className="input-field" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} style={{ marginBottom: 0 }} />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="button" onClick={() => setShowProfileModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border-light)', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 2, padding: '12px' }}>💾 Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
