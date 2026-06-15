import { useState, useEffect } from 'react';
import ClientList from './ClientList';
import WorkoutBuilder from './WorkoutBuilder';
import ReviewManager from './ReviewManager';
import TemplateManager from './TemplateManager';
import BillingManager from './BillingManager';
import { initChatIfEmpty } from '../utils/chatStore';
import { MOCK_CLIENTS } from '../utils/mockClients';
import { MOCK_ROUTINES } from '../utils/mockRoutines';
import { API_BASE_URL } from '../config';
import '../index.css';

export default function CoachDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('resumen');
  const [templateMode, setTemplateMode] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [workoutClient, setWorkoutClient] = useState('');

  const sampleRoutine = {
    Lunes: MOCK_ROUTINES["Día 1 - Pecho y Tríceps"] || [],
    Martes: MOCK_ROUTINES["Día 2 - Espalda y Bíceps"] || [],
    Miércoles: [],
    Jueves: MOCK_ROUTINES["Día 3 - Pierna"] || [],
    Viernes: MOCK_ROUTINES["Día 4 - Hombro y Abs"] || [],
    Sábado: [],
    Domingo: []
  };

  const davidRoutine = {
    Lunes: [
      { name: 'Press banca plano con mancuerna', reps: '3x6', intensity: 'RIR 2', notes: 'Peso: 25 KG', isOptional: false },
      { name: 'Contractor (peck deck)', reps: '3x12', intensity: 'Al fallo', notes: 'Peso: 54 KG (2 series x 12-14 reps + 1 serie x 5-7 reps)', isOptional: false },
      { name: 'Aperturas en polea media sentado', reps: '3x12-14', intensity: 'Al fallo', notes: 'Peso: 10 KG. Banco inclinado', isOptional: false },
      { name: 'Elevación lateral unilateral en banco inclinado', reps: '5xFallo', intensity: 'Al fallo', notes: 'Peso: 7.5 KG', isOptional: false },
      { name: 'Extensión tríceps katana en banco scott invertido', reps: '3x12-14', intensity: 'Al fallo', notes: '', isOptional: false },
      { name: 'Extensión tríceps polea alta', reps: '4x12-14', intensity: 'Al fallo', notes: 'Peso: 20 KG', isOptional: false },
      { name: 'Plancha abdominal', reps: '3x1\'', intensity: 'Al fallo', notes: '', isOptional: false }
    ],
    Martes: [
      { name: 'Remo dorian', reps: '3x10', intensity: 'Al fallo', notes: 'Peso: 40 KG', isOptional: false },
      { name: 'Jalón al pecho unilateral', reps: '2x12-14', intensity: 'Al fallo', notes: 'Peso: 27.5 KG', isOptional: false },
      { name: 'Dominadas', reps: '3xFallo', intensity: 'Al fallo', notes: 'Peso: 8 / 7 / 8 KG', isOptional: false },
      { name: 'Remo gironda unilateral', reps: '2x10-12', intensity: 'Al fallo', notes: 'Peso: 42.5 KG', isOptional: false },
      { name: 'Pájaro posterior unilateral en polea media (muñequera)', reps: '3x12-14', intensity: 'Al fallo', notes: 'Peso: 12.5 KG', isOptional: false },
      { name: 'Curl bíceps bayesian', reps: '3x10', intensity: 'Al fallo', notes: 'Peso: 12.5 KG', isOptional: false },
      { name: 'Curl bíceps mancuerna unilateral', reps: '3x10', intensity: 'Al fallo', notes: 'Peso: 10 / 10 / 7.5 KG', isOptional: false }
    ],
    Miércoles: [
      { name: 'BELT SQ / globet sq tempo 600', reps: '3x5', intensity: 'RPE 9', notes: 'Peso: 20 KG. Tempo: 6 (Globet con rusa)', isOptional: false },
      { name: 'Extensión de cuadriceps unilateral', reps: '2x12-14', intensity: 'Al fallo', notes: 'Peso: 25 KG. Por lado', isOptional: false },
      { name: 'Prensa horizontal', reps: '3x10', intensity: 'Al fallo', notes: 'Peso: 95 / 125 / 125 KG. Ko técnico, ayuda al final', isOptional: false },
      { name: 'Aductor en máquina', reps: '3x10-15', intensity: 'Al fallo', notes: 'Peso: 153 KG', isOptional: false },
      { name: 'Sentadilla búlgara', reps: '2x12-14', intensity: 'Al fallo', notes: '', isOptional: false },
      { name: 'Curl femoral tumbado unilateral', reps: '2x10-15', intensity: 'Al fallo', notes: '', isOptional: false }
    ],
    Jueves: [
      { name: 'Press banca declinado', reps: '3x7', intensity: 'RPE 9', notes: 'Peso: 20/20 KG', isOptional: true },
      { name: 'Cruces de polea', reps: '3x12-14', intensity: 'Al fallo', notes: 'Peso: 45/45 KG. Altura media', isOptional: true },
      { name: 'Egyptian lateral raises (polea)', reps: '3x10-12', intensity: 'Al fallo', notes: 'Peso: 20 o 25 / 30 KG', isOptional: true },
      { name: 'Press militar en máquina unilateral', reps: '3x6-8', intensity: 'RPE 9', notes: '', isOptional: true },
      { name: 'Press francés', reps: '2x12-14', intensity: 'Al fallo', notes: 'Peso: 17.5 KG', isOptional: true },
      { name: 'Flexiones de diamante', reps: '2x10', intensity: 'Al fallo', notes: '', isOptional: true },
      { name: 'Plancha lateral', reps: '2x30"', intensity: 'Al fallo', notes: '', isOptional: true }
    ],
    Viernes: [
      { name: 'Pull over', reps: '3x12-14', intensity: 'Al fallo', notes: '', isOptional: true },
      { name: 'Remo alto en máquina', reps: '3x10', intensity: 'Al fallo', notes: '', isOptional: true },
      { name: 'Seal row', reps: '2x10', intensity: 'Al fallo', notes: '', isOptional: true },
      { name: 'Curl bíceps barra en polea alta', reps: '2x12-14', intensity: 'Al fallo', notes: '', isOptional: true },
      { name: 'Curl bíceps barra romana', reps: '3x10-12', intensity: 'Al fallo', notes: '', isOptional: true }
    ],
    Sábado: [],
    Domingo: []
  };

  const [templates, setTemplates] = useState([
    { id: 't1', title: 'Hipertrofia 4 Días (Torso/Pierna)', description: 'Rutina clásica de hipertrofia con frecuencia 2.', routine: sampleRoutine },
    { id: 't2', title: 'Fuerza 3 Días (Full Body)', description: 'Rutina de fuerza enfocada en los básicos.', routine: sampleRoutine },
    { id: 't3', title: 'rutina david', description: 'Rutina David (Bloque 1) - Frecuencia 2 y Pierna.', routine: davidRoutine }
  ]);

  const [billingPlans, setBillingPlans] = useState([
    { id: 'bp1', name: 'Mensual', months: 1 },
    { id: 'bp2', name: 'Trimestral', months: 3 },
    { id: 'bp3', name: 'Semestral', months: 6 },
    { id: 'bp4', name: 'Anual', months: 12 }
  ]);

  const [clients, setClients] = useState(MOCK_CLIENTS);

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
      const formattedClients = data.map(u => {
        const existingMock = MOCK_CLIENTS.find(c => c.email === u.email);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          username: u.username,
          status: u.status || 'Activo',
          weight: existingMock ? existingMock.weight : '75kg',
          goal: u.goal || 'Hipertrofia',
          billingPlanId: u.billingPlanId || 'bp1',
          completion: existingMock ? existingMock.completion : 0,
          nextReview: existingMock ? existingMock.nextReview : 'En 1 mes',
          weightHistory: existingMock ? existingMock.weightHistory : [75.0],
          adherenceHistory: existingMock ? existingMock.adherenceHistory : [0],
          waistHistory: existingMock ? existingMock.waistHistory : [0],
          caderaHistory: existingMock ? existingMock.caderaHistory : [0],
          cuelloHistory: existingMock ? existingMock.cuelloHistory : [0],
          bicepsHistory: existingMock ? existingMock.bicepsHistory : [0],
          piernaHistory: existingMock ? existingMock.piernaHistory : [0],
          volumeHistory: existingMock ? existingMock.volumeHistory : [0],
          messages: [],
          hasRoutine: u.routineJson ? true : (existingMock ? existingMock.hasRoutine : false),
          routineJson: u.routineJson,
          routine: u.routineJson ? JSON.parse(u.routineJson) : null,
          progressionStrategy: u.progressionStrategy || 'Sobrecarga Progresiva (Subir peso)',
          reviewFrequency: u.reviewFrequency || 'Semanal'
        };
      });
      setClients(formattedClients);
    })
    .catch(err => console.error("Error loading clients:", err));
  }, []);

  useEffect(() => {
    const handleChatUpdate = (e) => {
      const { clientEmail, sender } = e.detail;
      if (sender === 'client' && window.activeChatEmail !== clientEmail) {
        setClients(prev => prev.map(c => 
          c.email === clientEmail ? { ...c, unreadMessages: (c.unreadMessages || 0) + 1 } : c
        ));
      }
    };
    window.addEventListener('chatUpdated', handleChatUpdate);
    return () => window.removeEventListener('chatUpdated', handleChatUpdate);
  }, []);

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
          if (client) setWorkoutClient(client.name);
          setActiveTab('rutinas');
          setTemplateMode(false);
        }} />}
        {activeTab === 'mensajes' && <ClientList clients={clients} setClients={setClients} isChatMode={true} />}
        {activeTab === 'rutinas' && <WorkoutBuilder clients={clients} templates={templates} isTemplateMode={templateMode} editingTemplate={editingTemplate} initialClient={workoutClient} setClients={setClients} />}
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
        {activeTab === 'revisiones' && <ReviewManager clients={clients} setClients={setClients} />}
        {activeTab === 'facturacion' && <BillingManager clients={clients} setClients={setClients} billingPlans={billingPlans} setBillingPlans={setBillingPlans} />}
      </div>

    </div>
  );
}
