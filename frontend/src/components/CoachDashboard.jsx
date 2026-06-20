import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ClientList from './ClientList';
import WorkoutBuilder from './WorkoutBuilder';
import ReviewManager from './ReviewManager';
import TemplateManager from './TemplateManager';
import BillingManager from './BillingManager';
import ExercisesManager from './ExercisesManager';
import ClientDetailView from './ClientDetailView';
// eslint-disable-next-line no-unused-vars
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
  const [showEjerciciosDropdown, setShowEjerciciosDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const portalRef = useRef(null);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0, width: 0 });
  
  // State for ClientDetailView
  const [viewDetailClientId, setViewDetailClientId] = useState(null);

  useEffect(() => {
    function handleClickOutside(event) {
      const clickedInsideTrigger = dropdownRef.current && dropdownRef.current.contains(event.target);
      const clickedInsidePortal = portalRef.current && portalRef.current.contains(event.target);
      if (!clickedInsideTrigger && !clickedInsidePortal) {
        setShowEjerciciosDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleScrollOrResize() {
      setShowEjerciciosDropdown(false);
    }
    if (showEjerciciosDropdown) {
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [showEjerciciosDropdown]);

  const toggleDropdown = () => {
    if (!showEjerciciosDropdown && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setShowEjerciciosDropdown(!showEjerciciosDropdown);
  };
  
  // Profile Editor State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    lastName: user.lastName || '',
    birthDate: user.birthDate || '',
    email: user.email || ''
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    .then(data => {
      const parsed = data.map(t => ({
        ...t,
        routine: t.routineJson ? (typeof t.routineJson === 'string' ? JSON.parse(t.routineJson) : t.routineJson) : null
      }));
      setTemplates(parsed);
    })
    .catch(err => console.error("Error loading templates:", err));
  }, []);


  const [billingPlans, setBillingPlans] = useState([
    { id: 'bp1', name: 'Mensual', months: 1 },
    { id: 'bp2', name: 'Trimestral', months: 3 },
    { id: 'bp3', name: 'Semestral', months: 6 },
    { id: 'bp4', name: 'Anual', months: 12 }
  ]);

  const [clients, setClients] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);

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
          strategies: u.strategies || [],
          billingPlanId,
          nextPaymentDate: computeNextPayment(u.createdAt, billingPlanId),
          messages: [],
          weight: u.currentWeight || 0,
          completion: u.compliance || 0,
          nextReview: u.nextReviewAt ? new Date(u.nextReviewAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A',
          routineJson: u.routineJson,
          routine: u.routineJson ? JSON.parse(u.routineJson) : null,
          nextRoutineJson: u.nextRoutineJson,
          nextRoutine: u.nextRoutineJson ? JSON.parse(u.nextRoutineJson) : null,
          progressionStrategy: u.progressionStrategy || 'No definida',
          reviewFrequency: u.reviewFrequency || 'Semanal',
          routineUpdatedAt: u.routineUpdatedAt
        };
      });
      setClients(formattedClients);
        setIsLoadingClients(false);
    })
    .catch(err => { console.error("Error loading clients:", err); setIsLoadingClients(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
              // eslint-disable-next-line no-unused-vars
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

      {/* Portal del Dropdown de Ejercicios */}
      {showEjerciciosDropdown && createPortal(
        <div 
          ref={portalRef}
          className="dropdown-menu-portal"
          style={{
            position: 'absolute',
            top: `${dropdownCoords.top}px`,
            left: `${dropdownCoords.left}px`,
            minWidth: '220px',
            background: 'rgba(20, 20, 24, 0.98)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            marginTop: '5px',
            zIndex: 9999,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div
            className={`dropdown-item ${activeTab === 'rutinas' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('rutinas');
              setShowEjerciciosDropdown(false);
            }}
          >
            📋 Asignar Rutina
          </div>
          <div
            className={`dropdown-item ${activeTab === 'plantillas' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('plantillas');
              setShowEjerciciosDropdown(false);
            }}
          >
            📥 Mis Plantillas
          </div>
          <div
            className={`dropdown-item ${activeTab === 'ejercicios' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('ejercicios');
              setShowEjerciciosDropdown(false);
            }}
          >
            🏋️ Ejercicios
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
