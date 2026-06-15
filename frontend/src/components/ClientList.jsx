import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MOCK_ROUTINES } from '../utils/mockRoutines';
import { getChatMessages, addChatMessage } from '../utils/chatStore';
import { getClientBillingStatus } from '../utils/statusUtils';
import { API_BASE_URL } from '../config';
import '../index.css';

export default function ClientList({ clients, setClients, billingPlans, onPlanRoutine, isChatMode }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', goal: 'Hipertrofia', reviewFrequency: 'Semanal', billingPlanId: 'bp1' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [createdClientInfo, setCreatedClientInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (!isChatMode) {
      const billStatus = getClientBillingStatus(c).text;
      
      if (statusFilter === 'Activo') {
        matchesStatus = c.status === 'Activo';
      } else if (statusFilter === 'Inactivo' || statusFilter === 'Desactivado') {
        matchesStatus = c.status === 'Inactivo';
      } else if (statusFilter === 'Al Día') {
        matchesStatus = c.status === 'Activo' && (['Al Día', 'Gratuito', 'Vence Hoy'].includes(billStatus) || billStatus.includes('restante'));
      } else if (statusFilter === 'Pendiente') {
        matchesStatus = c.status === 'Activo' && ['Pendiente', 'En Gracia', 'BAJA'].includes(billStatus);
      }
    }

    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortConfig.key) {
      if (sortConfig.key === 'name' || sortConfig.key === 'email') {
        const valA = a[sortConfig.key].toLowerCase();
        const valB = b[sortConfig.key].toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }
      if (sortConfig.key === 'status') {
        if (a.status === b.status) return 0;
        const valA = a.status === 'Activo' ? 1 : 0;
        const valB = b.status === 'Activo' ? 1 : 0;
        return sortConfig.direction === 'asc' ? valB - valA : valA - valB;
      }
      if (sortConfig.key === 'nextReview') {
        const parseDate = (d) => {
           if (!d || d === 'Pendiente' || d === 'No asignada') return new Date(8640000000000000);
           const parts = d.split('/');
           if(parts.length === 3) return new Date(parts[2], parts[1]-1, parts[0]);
           return new Date(8640000000000000);
        };
        const dateA = parseDate(a.nextReview).getTime();
        const dateB = parseDate(b.nextReview).getTime();
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      if (sortConfig.key === 'chat') {
        const unreadA = a.unreadMessages || 0;
        const unreadB = b.unreadMessages || 0;
        return sortConfig.direction === 'asc' ? unreadB - unreadA : unreadA - unreadB;
      }
    } else {
      if (isChatMode) {
        return (b.unreadMessages || 0) - (a.unreadMessages || 0);
      }
    }
    return 0;
  });

  // Modales Extra
  const [showChartModal, setShowChartModal] = useState(false);
  const [chartType, setChartType] = useState('weight'); // 'weight', 'adherence', 'waist', 'volume'
  const [expandedChart, setExpandedChart] = useState(null);
  
  const [showChatModal, setShowChatModal] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState({});
  const [clientHistoryData, setClientHistoryData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [trainerEditingSets, setTrainerEditingSets] = useState({});
  const [trainerEditingExtras, setTrainerEditingExtras] = useState({});
  
  const [openedFromTable, setOpenedFromTable] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);


  // Scroll automático en el chat
  useEffect(() => {
    if (showChatModal && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showChatModal, selectedClient?.messages]);

  useEffect(() => {
    if (showChatModal && selectedClient) {
      window.activeChatEmail = selectedClient.email;
    } else {
      window.activeChatEmail = null;
    }
    return () => { window.activeChatEmail = null; };
  }, [showChatModal, selectedClient]);

  // Fetch initial messages and set up polling when a chat is open
  useEffect(() => {
    let interval;
    if (showChatModal && selectedClient?.email) {
      // Fetch immediately
      getChatMessages(selectedClient.email).then(msgs => {
        setSelectedClient(prev => ({ ...prev, messages: msgs }));
        setClients(prev => prev.map(c => c.email === selectedClient.email ? { ...c, unreadMessages: 0 } : c));
      });

      // Poll every 3 seconds
      interval = setInterval(() => {
        getChatMessages(selectedClient.email).then(newMsgs => {
          setSelectedClient(prev => {
             // Only update if there are new messages to avoid unnecessary renders
             if (prev && newMsgs.length > prev.messages.length) {
                return { ...prev, messages: newMsgs };
             }
             return prev;
          });
          // Keep unread messages at 0 since chat is open
          setClients(prev => prev.map(c => c.email === selectedClient.email ? { ...c, unreadMessages: 0 } : c));
        });
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showChatModal, selectedClient?.email, setClients]);

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.email) return;
    
    const parts = newClient.name.trim().split(/\s+/);
    if (parts.length < 3) {
      alert("Se requiere el nombre y ambos apellidos (ej. Ana Gómez Pérez) para generar el usuario.");
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/create-client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newClient.name,
          email: newClient.email,
          goal: newClient.goal,
          reviewFrequency: newClient.reviewFrequency
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        alert("Error al registrar cliente: " + errorText);
        return;
      }

      const createdUser = await response.json();

      setClients([...clients, {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        username: createdUser.username,
        status: 'Activo',
        weight: newClient.weight || 'N/A',
        goal: newClient.goal,
        billingPlanId: newClient.billingPlanId,
        completion: 0,
        nextReview: 'En 1 mes',
        weightHistory: [parseFloat(newClient.weight) || 0],
        adherenceHistory: [0],
        waistHistory: [0],
        caderaHistory: [0],
        cuelloHistory: [0],
        bicepsHistory: [0],
        piernaHistory: [0],
        volumeHistory: [0],
        messages: [],
        hasRoutine: false
      }]);

      setCreatedClientInfo({
        name: createdUser.name,
        email: createdUser.email,
        username: createdUser.username
      });
      setIsAddingClient(false);
      setNewClient({ name: '', email: '', weight: '', goal: 'Hipertrofia', reviewFrequency: 'Semanal', billingPlanId: billingPlans?.[0]?.id || 'bp1' });
    } catch (err) {
      console.error(err);
      alert("Error de red al crear el cliente en el servidor.");
    }
  };

  const handleCopyCredentials = () => {
    if (!createdClientInfo) return;
    const textToCopy = `Nombre: ${createdClientInfo.name}\nEmail: ${createdClientInfo.email}\nUsuario: ${createdClientInfo.username}\nContraseña: ${createdClientInfo.username}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleStatus = () => {
    const isActivo = selectedClient.status === 'Activo';
    const msg = isActivo ? `¿Estás seguro de que deseas desactivar a ${selectedClient.name}? No podrá recibir nuevas rutinas.` : `¿Deseas volver a activar a ${selectedClient.name}?`;
    if (window.confirm(msg)) {
      const newStatus = isActivo ? 'Inactivo' : 'Activo';
      setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, status: newStatus } : c));
      setSelectedClient({ ...selectedClient, status: newStatus });
    }
  };

  const handlePlanRoutine = () => {
    const clientToEdit = selectedClient;
    setSelectedClient(null);
    if (onPlanRoutine) onPlanRoutine(clientToEdit);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const input = chatInput;
    setChatInput('');
    
    const updatedMessages = await addChatMessage(selectedClient.email, input);
    
    if (updatedMessages) {
      setClients(clients.map(c => {
        if (c.id === selectedClient.id) return { ...c, messages: updatedMessages };
        return c;
      }));
      setSelectedClient({ ...selectedClient, messages: updatedMessages });
    }
  };

  const renderChart = (type = chartType) => {
    let history = [];
    let color = 'var(--accent-primary)';
    let unit = '';
    let title = '';

    if (type === 'weight') {
      history = selectedClient.weightHistory;
      unit = 'kg';
      title = 'Evolución del Peso Corporal';
    } else if (type === 'adherence') {
      history = selectedClient.adherenceHistory;
      unit = '%';
      title = 'Cumplimiento de Rutina';
      color = '#00f2fe'; // Azul Neón
    } else if (type === 'waist') {
      history = selectedClient.waistHistory;
      unit = 'cm';
      title = 'Perímetro de Cintura';
      color = '#ff0844'; // Rojo Neón
    } else if (type === 'cadera') {
      history = selectedClient.caderaHistory;
      unit = 'cm';
      title = 'Perímetro de Cadera';
      color = '#bb00ff'; // Morado Neón
    } else if (type === 'cuello') {
      history = selectedClient.cuelloHistory;
      unit = 'cm';
      title = 'Perímetro de Cuello';
      color = '#00ff88'; // Verde Neón
    } else if (type === 'biceps') {
      history = selectedClient.bicepsHistory;
      unit = 'cm';
      title = 'Perímetro de Bíceps';
      color = '#ff00aa'; // Rosa Neón
    } else if (type === 'pierna') {
      history = selectedClient.piernaHistory;
      unit = 'cm';
      title = 'Perímetro de Pierna';
      color = '#00d2ff'; // Cian Oscuro Neón
    } else if (type === 'volume') {
      history = selectedClient.volumeHistory;
      unit = 'kg';
      title = 'Volumen Total Levantado (Sobrecarga Progresiva)';
      color = '#ffaa00'; // Naranja
    }

    if (!history || history.length === 0 || history[0] === 0) return <p style={{ color: 'var(--text-muted)' }}>No hay datos suficientes para esta métrica.</p>;
    if (history.length === 1) return <p style={{ color: 'var(--text-muted)' }}>Dato actual: {history[0]}{unit}. Esperando más semanas para trazar gráfica.</p>;

    const min = type === 'volume' ? Math.floor(Math.min(...history) - 500) : Math.floor(Math.min(...history) - 2);
    const max = type === 'volume' ? Math.ceil(Math.max(...history) + 500) : Math.ceil(Math.max(...history) + 2);
    const range = max - min || 1;

    const svgWidth = 600;
    const svgHeight = 220;
    const paddingY = 40;
    const paddingX = 40;
    
    const getX = (index) => paddingX + (index / (history.length - 1)) * (svgWidth - paddingX * 2);
    const getY = (val) => svgHeight - paddingY - ((val - min) / range) * (svgHeight - paddingY * 2);

    const points = history.map((val, i) => `${getX(i)},${getY(val)}`).join(' ');
    const areaPath = `M ${getX(0)},${svgHeight - paddingY + 20} L ${points.split(' ').join(' L ')} L ${getX(history.length - 1)},${svgHeight - paddingY + 20} Z`;

    return (
      <div className="fade-in" style={{ marginTop: '30px' }}>
        <h4 style={{ color: 'white', textAlign: 'center', marginBottom: '25px', fontWeight: '800', fontSize: '1.4rem' }}>{title}</h4>
        <div style={{ background: 'rgba(10,10,12,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '30px 20px 10px', position: 'relative', overflowX: 'visible', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={color} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(factor => {
               const y = svgHeight - paddingY - factor * (svgHeight - paddingY * 2);
               return <line key={factor} x1={paddingX - 10} y1={y} x2={svgWidth - paddingX + 10} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
            })}

            {/* Area and Line */}
            <path d={areaPath} fill={`url(#grad-${type})`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0px 8px 12px ${color}40)` }} />
            
            {/* Points and Labels */}
            {history.map((val, index) => (
              <g key={index} style={{ transition: 'all 0.3s' }}>
                <circle cx={getX(index)} cy={getY(val)} r="8" fill="#0a0a0c" stroke={color} strokeWidth="3" style={{ cursor: 'pointer' }} />
                <text x={getX(index)} y={getY(val) - 20} fill={color} fontSize="16" fontWeight="800" textAnchor="middle" fontFamily="Outfit" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{val}{unit}</text>
                <text x={getX(index)} y={svgHeight - 5} fill="var(--text-muted)" fontSize="13" fontWeight="600" textAnchor="middle" textTransform="uppercase" fontFamily="Outfit" letterSpacing="1px">Mes {index + 1}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '30px', position: 'relative' }}>
      
      {/* Cabecera Principal */}
      <div className="mobile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
        <h3 style={{ fontSize: '1.2rem' }}>{isChatMode ? 'Mensajes Privados' : 'Tus Clientes Premium'}</h3>
        <div className="mobile-header-actions" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {!isChatMode && (
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
              style={{ marginBottom: '0', width: '150px' }}
            >
              <option value="Todos">Todos</option>
              <option value="Activo">Activos</option>
              <option value="Inactivo">Inactivos</option>
            </select>
          )}
          <input 
            type="text" 
            className="input-field" 
            placeholder="🔍 Buscar cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: '0', width: '300px' }}
          />
          {!isChatMode && (
            <button 
              onClick={() => setIsAddingClient(true)} 
              style={{ background: 'var(--accent-primary)', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>+</span> Nuevo Cliente
            </button>
          )}
        </div>
      </div>
      
      {/* Tabla de Clientes */}
      <div className="table-responsive">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
          <thead>
          <tr style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>
            <th style={{ paddingBottom: '15px', cursor: 'pointer' }} onClick={() => handleSort('name')}>Nombre {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
            <th style={{ paddingBottom: '15px', cursor: 'pointer' }} onClick={() => handleSort('email')}>Email {sortConfig.key === 'email' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
            {!isChatMode && <th style={{ paddingBottom: '15px', cursor: 'pointer' }} onClick={() => handleSort('status')}>Estado {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>}
            {!isChatMode && <th style={{ paddingBottom: '15px', cursor: 'pointer' }} onClick={() => handleSort('nextReview')}>Próx. Revisión {sortConfig.key === 'nextReview' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>}
            <th style={{ paddingBottom: '15px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('chat')}>Chat {sortConfig.key === 'chat' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
            {!isChatMode && <th style={{ paddingBottom: '15px', textAlign: 'right' }}>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {filteredClients.map(client => (
            <tr key={client.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: '15px 0', fontWeight: '600' }}>{client.name}</td>
              <td style={{ padding: '15px 0', color: 'var(--text-muted)' }}>{client.email}</td>
              {!isChatMode && (
                <>
                  <td style={{ padding: '15px 0' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold',
                      background: client.status === 'Activo' ? 'rgba(224, 248, 0, 0.1)' : 'rgba(255, 69, 0, 0.1)',
                      color: client.status === 'Activo' ? 'var(--accent-primary)' : '#ff4500'
                    }}>
                      {client.status}
                    </span>
                  </td>
                  <td style={{ padding: '15px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {client.status === 'Inactivo' ? '-' : (client.nextReview || 'No asignada')}
                  </td>
                </>
              )}
              <td style={{ padding: '15px 0', textAlign: 'center' }}>
                <button 
                  onClick={() => {
                    setOpenedFromTable(true);
                    setClients(prev => prev.map(c => c.id === client.id ? { ...c, unreadMessages: 0 } : c));
                    const currentMsgs = getChatMessages(client.email);
                    setSelectedClient({...client, unreadMessages: 0, messages: currentMsgs});
                    setShowChatModal(true);
                  }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', fontSize: '1.2rem', color: client.unreadMessages > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                  title="Abrir Chat"
                >
                  💬
                  {client.unreadMessages > 0 && (
                    <span style={{
                      position: 'absolute', top: '-5px', right: '-8px',
                      background: '#ff4500', color: '#fff', fontSize: '0.6rem', fontWeight: 'bold',
                      borderRadius: '50%', padding: '2px 6px'
                    }}>
                      {client.unreadMessages}
                    </span>
                  )}
                </button>
              </td>
              {!isChatMode && (
                <td style={{ padding: '15px 0', textAlign: 'right' }}>
                  <button 
                    onClick={() => setSelectedClient(client)}
                    style={{ background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s', fontWeight: 'bold' }}
                  >
                    Ver Detalle
                  </button>
                </td>
              )}
            </tr>
          ))}
          {filteredClients.length === 0 && (
            <tr><td colSpan={isChatMode ? 3 : 6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No se encontraron clientes.</td></tr>
          )}
        </tbody>
      </table>
      </div>

      {/* Modal Añadir Cliente */}
      {isAddingClient && createPortal(
        <div className="fade-in" onClick={() => setIsAddingClient(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)',
          zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="glass-panel" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px', background: 'rgba(20, 20, 24, 0.98)', padding: '30px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
              <div>
                <h3 style={{ fontSize: '1.8rem', color: 'var(--accent-primary)', fontWeight: '800' }}>Vincular Nuevo Cliente</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>El cliente recibirá una invitación premium.</p>
              </div>
              <button onClick={() => setIsAddingClient(false)} style={{ background: 'transparent', border: 'none', color: '#ff4500', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ display: 'grid', gap: '20px', flex: 1, overflowY: 'auto' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Nombre y Ambos Apellidos (Obligatorio)</label>
                <input type="text" className="input-field" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} placeholder="Ej. Ana Gómez Pérez" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Correo Electrónico</label>
                <input type="email" className="input-field" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} placeholder="ana@mail.com" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Objetivo Principal</label>
                <select className="input-field" value={newClient.goal} onChange={e => setNewClient({...newClient, goal: e.target.value})}>
                  <option value="Hipertrofia">Hipertrofia</option>
                  <option value="Pérdida de Grasa">Pérdida de Grasa</option>
                  <option value="Fuerza">Fuerza</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Frecuencia de Revisiones</label>
                <select className="input-field" value={newClient.reviewFrequency} onChange={e => setNewClient({...newClient, reviewFrequency: e.target.value})}>
                  <option value="Semanal">Semanal (1 semana)</option>
                  <option value="Bisemanal">Bisemanal (2 semanas)</option>
                  <option value="3 Semanas">Cada 3 Semanas</option>
                  <option value="Mensual">Mensual (4 semanas)</option>
                  <option value="Bimensual">Bimensual (8 semanas)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Plan de Facturación</label>
                <select className="input-field" value={newClient.billingPlanId} onChange={e => setNewClient({...newClient, billingPlanId: e.target.value})}>
                  {billingPlans && billingPlans.map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.name} ({plan.months} {plan.months === 1 ? 'mes' : 'meses'})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button className="btn-primary" onClick={handleAddClient} style={{ width: '100%' }}>✉️ Enviar Invitación</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* Modal Principal Detalles Cliente */}
      {selectedClient && !showChartModal && !showChatModal && !showHistoryModal && createPortal(
        <div className="fade-in" onClick={() => setSelectedClient(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)',
          zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="glass-panel" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '900px', background: 'rgba(20, 20, 24, 0.98)', padding: '40px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header del Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
              <div>
                <h3 style={{ fontSize: '2rem', color: 'var(--accent-primary)', fontWeight: '800' }}>{selectedClient.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{selectedClient.email} • Premium</p>
              </div>
              <button onClick={() => setSelectedClient(null)} style={{ background: 'transparent', border: '1px solid var(--border-light)', borderRadius: '50%', width: '40px', height: '40px', color: 'var(--text-main)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            {/* Tarjetas de Estadísticas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '40px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Objetivo</p>
                <h4 style={{ fontSize: '1.2rem', marginTop: '8px', fontWeight: '600' }}>{selectedClient.goal}</h4>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Peso Actual</p>
                <h4 style={{ fontSize: '1.2rem', marginTop: '8px', fontWeight: '600' }}>{selectedClient.weightHistory[selectedClient.weightHistory.length - 1] || selectedClient.weight}kg</h4>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Cumplimiento</p>
                <h4 style={{ fontSize: '1.2rem', marginTop: '8px', fontWeight: '800', color: selectedClient.completion > 80 ? 'var(--accent-primary)' : '#ffaa00' }}>{selectedClient.completion}%</h4>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Próx. Revisión</p>
                <h4 style={{ fontSize: '1.1rem', marginTop: '8px', fontWeight: '600' }}>{selectedClient.nextReview}</h4>
              </div>
            </div>

            {/* Estrategia de Progresión */}
            <h4 style={{ marginBottom: '10px', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Estrategia de Progresión (Pesos)</h4>
            <div style={{ marginBottom: '25px' }}>
              <select 
                className="input-field" 
                value={selectedClient.progressionStrategy || "Sobrecarga Progresiva (Subir peso)"}
                onChange={(e) => {
                  const newStrategy = e.target.value;
                  setSelectedClient(prev => ({ ...prev, progressionStrategy: newStrategy }));
                  setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, progressionStrategy: newStrategy } : c));
                  alert("Estrategia actualizada a: " + newStrategy);
                }}
                style={{ width: '100%' }}
              >
                <option value="Sobrecarga Progresiva (Subir peso)">Sobrecarga Progresiva (Subir peso)</option>
                <option value="Aumentar Repeticiones (Mantener peso)">Aumentar Repeticiones (Mantener peso)</option>
                <option value="Mantenimiento (Mismo peso y reps)">Mantenimiento (Mismo peso y reps)</option>
                <option value="Semana de Descarga (Bajar peso/volumen)">Semana de Descarga (Bajar peso/volumen)</option>
                <option value="Foco en Técnica (Bajar peso)">Foco en Técnica (Bajar peso)</option>
              </select>
            </div>

            {/* Acciones del Cliente */}
            <h4 style={{ marginBottom: '20px', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Panel de Control Activo</h4>
            <div className="responsive-grid-2">
              {selectedClient.status === 'Activo' ? (
                <>
                  <button 
                    onClick={() => selectedClient.hasRoutine !== false && handlePlanRoutine()} 
                    className="btn-primary" 
                    style={{ 
                      padding: '15px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
                      background: selectedClient.hasRoutine !== false ? 'rgba(224, 248, 0, 0.1)' : 'rgba(255,255,255,0.05)', 
                      border: selectedClient.hasRoutine !== false ? '1px solid var(--accent-primary)' : '1px solid var(--border-light)', 
                      color: selectedClient.hasRoutine !== false ? 'var(--accent-primary)' : 'var(--text-muted)',
                      cursor: selectedClient.hasRoutine !== false ? 'pointer' : 'not-allowed',
                      opacity: selectedClient.hasRoutine !== false ? 1 : 0.6
                    }}
                  >
                    {selectedClient.hasRoutine !== false ? '👀 Ver / Editar Rutina Actual' : '🚫 Sin Rutina Actual'}
                  </button>
                  <button onClick={handlePlanRoutine} className="btn-primary" style={{ padding: '15px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    📝 Planificar Siguiente Rutina
                  </button>
                </>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  ⚠️ Activa al cliente para planificar rutina
                </div>
              )}
              <button onClick={() => setShowChartModal(true)} style={{ background: 'rgba(224, 248, 0, 0.05)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
                📈 Ver Gráficas de Evolución
              </button>
              {selectedClient.videoLink && (
                <button style={{ background: 'rgba(255, 0, 0, 0.1)', border: '1px solid #ff0000', color: '#ff4444', padding: '20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', gridColumn: 'span 2' }}>
                  🎬 Ver Técnica (Nuevo Vídeo Subido)
                </button>
              )}
              <button onClick={() => {
                setOpenedFromTable(false);
                setShowChatModal(true);
              }} style={{ background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-main)', padding: '20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
                💬 Enviar Mensaje Directo
              </button>
              <button style={{ background: 'rgba(224, 248, 0, 0.1)', border: '1px solid var(--accent-primary)', color: 'var(--text-main)', padding: '20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }} onClick={() => {
                setShowHistoryModal(true);
                setIsLoadingHistory(true);
                const token = localStorage.getItem('token');
                fetch(`${API_BASE_URL}/api/workouts/history/by-email/${selectedClient.email}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => res.json())
                .then(data => {
                  setClientHistoryData(data);
                  setIsLoadingHistory(false);
                })
                .catch(err => {
                  console.error(err);
                  setIsLoadingHistory(false);
                });
              }}>
                🏋️ Ver Historial de Entrenos
              </button>
              {selectedClient.status === 'Activo' ? (
                <button onClick={handleToggleStatus} style={{ background: 'rgba(255, 69, 0, 0.05)', border: '1px solid #ff4500', color: '#ff4500', padding: '20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  🛑 Desactivar Cliente
                </button>
              ) : (
                <button onClick={handleToggleStatus} style={{ background: 'rgba(0, 230, 118, 0.05)', border: '1px solid #00e676', color: '#00e676', padding: '20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  ✅ Activar Cliente
                </button>
              )}
            </div>
          </div>
        </div>, document.body
      )}

      {/* Sub-Modal Gráficas */}
      {showChartModal && selectedClient && createPortal(
        <div className="fade-in" onClick={() => setShowChartModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', zIndex: 1001, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="glass-panel" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '1000px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>Gráficas de <span style={{ color: 'var(--accent-primary)' }}>{selectedClient.name}</span></h3>
              <button onClick={() => setShowChartModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>

            <div className="custom-scrollbar" style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '15px', borderBottom: '1px solid var(--border-light)', marginBottom: '20px', whiteSpace: 'nowrap' }}>
              {[
                { id: 'weight', icon: '⚖️', label: 'Peso', color: 'var(--accent-primary)' },
                { id: 'adherence', icon: '📊', label: 'Cumplimiento', color: '#00f2fe' },
                { id: 'measures', icon: '📏', label: 'Medidas Corporales', color: '#ff0844' },
                { id: 'volume', icon: '🏋️', label: 'Volumen', color: '#ffaa00' }
              ].map(tab => {
                const isActive = chartType === tab.id;
                return (
                  <button 
                    key={tab.id}
                    onClick={() => { setChartType(tab.id); setExpandedChart(null); }} 
                    style={{ 
                      padding: '8px 20px', 
                      fontWeight: '600', 
                      fontSize: '0.9rem',
                      background: isActive ? `${tab.color}15` : 'rgba(255,255,255,0.03)', 
                      color: isActive ? tab.color : 'var(--text-muted)', 
                      border: `1px solid ${isActive ? tab.color : 'transparent'}`, 
                      borderRadius: '30px', 
                      cursor: 'pointer', 
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: isActive ? `0 0 10px ${tab.color}30` : 'none'
                    }}
                  >
                    <span>{tab.icon}</span> {tab.label}
                  </button>
                )
              })}
            </div>

            {chartType === 'measures' ? (
              expandedChart ? (
                <div>
                  <button onClick={() => setExpandedChart(null)} style={{ background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '8px 20px', borderRadius: '30px', cursor: 'pointer', marginBottom: '10px', fontWeight: 'bold' }}>⬅ Volver a la Cuadrícula</button>
                  {renderChart(expandedChart)}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  <div style={{cursor: 'pointer', transition: 'transform 0.2s'}} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} onClick={() => setExpandedChart('waist')}>{renderChart('waist')}</div>
                  <div style={{cursor: 'pointer', transition: 'transform 0.2s'}} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} onClick={() => setExpandedChart('cadera')}>{renderChart('cadera')}</div>
                  <div style={{cursor: 'pointer', transition: 'transform 0.2s'}} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} onClick={() => setExpandedChart('cuello')}>{renderChart('cuello')}</div>
                  <div style={{cursor: 'pointer', transition: 'transform 0.2s'}} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} onClick={() => setExpandedChart('biceps')}>{renderChart('biceps')}</div>
                  <div style={{cursor: 'pointer', transition: 'transform 0.2s'}} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} onClick={() => setExpandedChart('pierna')}>{renderChart('pierna')}</div>
                </div>
              )
            ) : (
              renderChart()
            )}
            </div>
          </div>
        </div>, document.body
      )}

      {/* Sub-Modal Chat */}
      {showChatModal && selectedClient && createPortal(
        <div className="fade-in" onClick={() => { setShowChatModal(false); if(openedFromTable) setSelectedClient(null); }} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', zIndex: 1001, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="glass-panel" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', height: '600px', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-primary)' }}>💬 Chat con {selectedClient.name.split(' ')[0]}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>En línea</p>
              </div>
              <button onClick={() => {
                setShowChatModal(false);
                if (openedFromTable) setSelectedClient(null);
              }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {selectedClient.messages.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>No hay mensajes. ¡Di hola!</p>}
              {selectedClient.messages.map((msg, idx) => (
                <div key={idx} style={{ alignSelf: msg.sender === 'coach' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  <div style={{
                    padding: '12px 16px', borderRadius: '12px',
                    background: msg.sender === 'coach' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                    color: msg.sender === 'coach' ? '#000' : '#fff',
                    borderBottomRightRadius: msg.sender === 'coach' ? '0' : '12px',
                    borderBottomLeftRadius: msg.sender === 'client' ? '0' : '12px',
                  }}>
                    {msg.text}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block', textAlign: msg.sender === 'coach' ? 'right' : 'left' }}>{msg.time}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} style={{ padding: '20px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '10px' }}>
              <input type="text" className="input-field" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Escribe un mensaje..." style={{ marginBottom: 0, flex: 1 }} />
              <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 20px' }}>Enviar</button>
            </form>
          </div>
        </div>, document.body
      )}

      {/* Modal Historial de Entrenamientos */}
      {showHistoryModal && selectedClient && createPortal(
        <div className="fade-in" onClick={() => setShowHistoryModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', zIndex: 1001, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="glass-panel" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-primary)' }}>📅 Historial de {selectedClient.name.split(' ')[0]}</h3>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {isLoadingHistory ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando historial...</div>
              ) : clientHistoryData.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Este cliente aún no ha registrado ningún entrenamiento.</div>
              ) : (
                clientHistoryData.map(session => {
                  let sessionLogs = {};
                  let sessionComments = {};
                  let sessionVideos = {};
                  try { sessionLogs = JSON.parse(session.logsJson || '{}'); } catch(e){}
                  try { sessionComments = JSON.parse(session.commentsJson || '{}'); } catch(e){}
                  try { sessionVideos = JSON.parse(session.videoLinksJson || '{}'); } catch(e){}

                  const routineExercises = MOCK_ROUTINES[session.dayName] || [];
                  const sortedExercises = [...routineExercises].sort((a, b) => (a.isOptional === b.isOptional ? 0 : a.isOptional ? 1 : -1));
                  // Try to get the day's logs - they might be nested under dayName or flat
                  const dayLogs = sessionLogs[session.dayName] || sessionLogs;

                  return (
                  <div key={session.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{session.dayName}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '12px' }}>{session.sessionDate}</span>
                    </div>
                    
                    <div className="responsive-grid-2" style={{ gap: '10px' }}>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{session.totalVolume} kg</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Volumen</div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{Math.floor(session.durationSeconds / 60)} min</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tiempo</div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{session.completedSets}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Series</div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: session.completionPercentage >= 80 ? 'var(--accent-primary)' : '#ffaa00' }}>{session.completionPercentage}%</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completado</div>
                      </div>
                    </div>
                    <button onClick={() => setExpandedSessions(prev => ({ ...prev, [session.id]: !prev[session.id] }))} style={{ marginTop: '10px', alignSelf: 'flex-end', background: 'var(--accent-primary)', color: '#000', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      {expandedSessions[session.id] ? '▲ Ocultar Detalles' : '▼ Ver Detalles (como el cliente)'}
                    </button>
                    {expandedSessions[session.id] && (
                      <div style={{ marginTop: '10px', display: 'grid', gap: '20px' }}>
                        {sortedExercises.map((exercise, exIdx) => {
                          const exLogs = dayLogs[exIdx] || [];
                          const stateKey = `${session.dayName}_${exIdx}`;
                          const sessionEditKey = `${session.id}_${exIdx}`;
                          const isEditingExtra = trainerEditingExtras[sessionEditKey];

                          return (
                            <div key={exIdx} style={{ padding: '15px', borderLeft: exercise.isOptional ? '4px solid #ffaa00' : '4px solid var(--accent-primary)', background: 'rgba(20, 20, 24, 0.8)', borderRadius: '8px' }}>
                              <div style={{ marginBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#fff' }}>{exercise.name}</h4>
                                  {exercise.isOptional && <span style={{ background: 'rgba(255, 170, 0, 0.1)', color: '#ffaa00', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>OPCIONAL</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🎯 <strong style={{ color: '#fff' }}>{exercise.reps}</strong></span>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🔥 <strong style={{ color: '#fff' }}>{exercise.intensity}</strong></span>
                                </div>
                              </div>

                              {/* Sets Grid */}
                              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 90px', gap: '8px', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                  <div style={{ textAlign: 'center' }}>Set</div><div style={{ textAlign: 'center' }}>kg</div><div style={{ textAlign: 'center' }}>Reps</div><div style={{ textAlign: 'center' }}>Estado</div>
                                </div>
                                {exLogs.map((set, setIdx) => {
                                  const setEditKey = `${session.id}_${exIdx}-${setIdx}`;
                                  const isEditingSet = trainerEditingSets[setEditKey];
                                  return (
                                    <div key={setIdx} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 90px', gap: '8px', padding: '10px 12px', background: set.completed ? 'rgba(224, 248, 0, 0.03)' : (set.skipped ? 'rgba(255,255,255,0.02)' : 'transparent'), opacity: set.skipped ? 0.5 : 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: set.completed ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{setIdx + 1}</div>
                                      <div><input type="number" step="0.5" value={set.weight} disabled={!isEditingSet} onChange={(e) => {
                                        const newData = [...clientHistoryData];
                                        const sIdx = newData.findIndex(s => s.id === session.id);
                                        const newLogs = JSON.parse(newData[sIdx].logsJson || '{}');
                                        const dl = newLogs[session.dayName] || newLogs;
                                        dl[exIdx][setIdx].weight = e.target.value;
                                        newData[sIdx].logsJson = JSON.stringify(newLogs);
                                        setClientHistoryData(newData);
                                      }} style={{ width: '100%', padding: '8px', background: isEditingSet ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', border: isEditingSet ? '1px solid var(--accent-primary)' : 'none', borderRadius: '6px', color: '#fff', textAlign: 'center' }} /></div>
                                      <div><input type="text" value={set.reps} disabled={!isEditingSet} onChange={(e) => {
                                        const newData = [...clientHistoryData];
                                        const sIdx = newData.findIndex(s => s.id === session.id);
                                        const newLogs = JSON.parse(newData[sIdx].logsJson || '{}');
                                        const dl = newLogs[session.dayName] || newLogs;
                                        dl[exIdx][setIdx].reps = e.target.value;
                                        newData[sIdx].logsJson = JSON.stringify(newLogs);
                                        setClientHistoryData(newData);
                                      }} style={{ width: '100%', padding: '8px', background: isEditingSet ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', border: isEditingSet ? '1px solid var(--accent-primary)' : 'none', borderRadius: '6px', color: '#fff', textAlign: 'center' }} /></div>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {isEditingSet ? (
                                          <button onClick={() => {
                                            setTrainerEditingSets({...trainerEditingSets, [setEditKey]: false});
                                            // Save to backend
                                            const s = clientHistoryData.find(s => s.id === session.id);
                                            const token = localStorage.getItem('token');
                                            fetch(`${API_BASE_URL}/api/workouts/update/${session.id}`, {
                                              method: 'PUT',
                                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                              body: JSON.stringify({ dayName: s.dayName, durationSeconds: s.durationSeconds, totalVolume: s.totalVolume, completedSets: s.completedSets, completionPercentage: s.completionPercentage, logsJson: s.logsJson, commentsJson: s.commentsJson, videoLinksJson: s.videoLinksJson })
                                            });
                                          }} style={{ padding: '4px 10px', borderRadius: '6px', background: 'var(--accent-primary)', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}>💾</button>
                                        ) : (
                                          <button onClick={() => setTrainerEditingSets({...trainerEditingSets, [setEditKey]: true})} style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.75rem' }}>✏️</button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                {exLogs.length === 0 && (
                                  <div style={{ padding: '15px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin datos de series registrados</div>
                                )}
                              </div>

                                {/* Comments & Video Links */}
                                <div style={{ display: 'grid', gap: '8px' }}>
                                  {isEditingExtra ? (
                                    <>
                                      <input type="text" placeholder="Comentario del cliente..." value={sessionComments[stateKey] || ''} onChange={(e) => {
                                        const newData = [...clientHistoryData];
                                        const sIdx = newData.findIndex(s => s.id === session.id);
                                        const newComments = JSON.parse(newData[sIdx].commentsJson || '{}');
                                        newComments[stateKey] = e.target.value;
                                        newData[sIdx].commentsJson = JSON.stringify(newComments);
                                        setClientHistoryData(newData);
                                      }} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--accent-primary)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }} />
                                      <input type="text" placeholder="🔗 Link de vídeo..." value={sessionVideos[stateKey] || ''} onChange={(e) => {
                                        const newData = [...clientHistoryData];
                                        const sIdx = newData.findIndex(s => s.id === session.id);
                                        const newVideos = JSON.parse(newData[sIdx].videoLinksJson || '{}');
                                        newVideos[stateKey] = e.target.value;
                                        newData[sIdx].videoLinksJson = JSON.stringify(newVideos);
                                        setClientHistoryData(newData);
                                      }} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--accent-primary)', borderRadius: '6px', color: 'var(--accent-primary)', fontSize: '0.85rem' }} />
                                      <textarea placeholder="Feedback del Entrenador (el cliente lo verá)..." value={sessionComments[`coach_${stateKey}`] || ''} onChange={(e) => {
                                        const newData = [...clientHistoryData];
                                        const sIdx = newData.findIndex(s => s.id === session.id);
                                        const newComments = JSON.parse(newData[sIdx].commentsJson || '{}');
                                        newComments[`coach_${stateKey}`] = e.target.value;
                                        newData[sIdx].commentsJson = JSON.stringify(newComments);
                                        setClientHistoryData(newData);
                                      }} style={{ width: '100%', padding: '10px', background: 'rgba(224, 248, 0, 0.05)', border: '1px solid var(--accent-primary)', borderRadius: '6px', color: 'var(--accent-primary)', fontSize: '0.85rem', minHeight: '60px', fontFamily: 'Outfit' }} />
                                      <button onClick={() => {
                                        setTrainerEditingExtras({...trainerEditingExtras, [sessionEditKey]: false});
                                        const s = clientHistoryData.find(s => s.id === session.id);
                                        const token = localStorage.getItem('token');
                                        fetch(`${API_BASE_URL}/api/workouts/update/${session.id}`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                          body: JSON.stringify({ dayName: s.dayName, durationSeconds: s.durationSeconds, totalVolume: s.totalVolume, completedSets: s.completedSets, completionPercentage: s.completionPercentage, logsJson: s.logsJson, commentsJson: s.commentsJson, videoLinksJson: s.videoLinksJson })
                                        });
                                      }} style={{ alignSelf: 'flex-end', padding: '5px 12px', borderRadius: '6px', background: 'var(--accent-primary)', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}>💾 Guardar Notas</button>
                                    </>
                                  ) : (
                                    <>
                                      {sessionComments[stateKey] && <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}>💬 Cliente: {sessionComments[stateKey]}</div>}
                                      {sessionVideos[stateKey] && <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--accent-primary)', fontSize: '0.85rem' }}>🔗 {sessionVideos[stateKey]}</div>}
                                      {sessionComments[`coach_${stateKey}`] && <div style={{ padding: '8px 12px', background: 'rgba(224, 248, 0, 0.05)', border: '1px dashed var(--accent-primary)', borderRadius: '6px', color: 'var(--accent-primary)', fontSize: '0.85rem' }}>👨‍🏫 Feedback: {sessionComments[`coach_${stateKey}`]}</div>}
                                      <button onClick={() => setTrainerEditingExtras({...trainerEditingExtras, [sessionEditKey]: true})} style={{ alignSelf: 'flex-end', padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.7rem' }}>✏️ Editar Notas</button>
                                    </>
                                  )}
                                </div>
                            </div>
                          );
                        })}

                        {sortedExercises.length === 0 && (
                          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No se encontró la rutina "{session.dayName}" en las rutinas configuradas. Datos brutos disponibles.</div>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </div>, document.body
      )}

      {createdClientInfo && createPortal(
        <div className="fade-in" onClick={() => setCreatedClientInfo(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)',
          zIndex: 1002, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="glass-panel" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', background: 'rgba(20, 20, 24, 0.98)', padding: '30px', display: 'flex', flexDirection: 'column', border: '1px solid var(--accent-primary)', borderRadius: '16px', boxShadow: '0 0 30px rgba(224, 248, 0, 0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>✅</div>
              <h3 style={{ fontSize: '1.6rem', color: 'var(--accent-primary)', fontWeight: '800', margin: '0 0 10px 0' }}>¡Cliente Creado!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                Copia las siguientes credenciales para compartirlas con el cliente:
              </p>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', display: 'grid', gap: '15px', marginBottom: '25px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nombre</span>
                <span style={{ fontSize: '1.05rem', color: '#fff', fontWeight: '600' }}>{createdClientInfo.name}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</span>
                <span style={{ fontSize: '1.05rem', color: '#fff', fontWeight: '600' }}>{createdClientInfo.email}</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuario</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(224, 248, 0, 0.05)', padding: '10px 14px', borderRadius: '6px', border: '1px dashed var(--accent-primary)', marginTop: '5px' }}>
                  <code style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', fontFamily: 'monospace' }}>{createdClientInfo.username}</code>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contraseña Temporal</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(224, 248, 0, 0.05)', padding: '10px 14px', borderRadius: '6px', border: '1px dashed var(--accent-primary)', marginTop: '5px' }}>
                  <code style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', fontFamily: 'monospace' }}>{createdClientInfo.username}</code>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                  ⚠️ Igual al usuario. Se le pedirá cambiarla al primer inicio de sesión.
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              <button className="btn-primary" onClick={handleCopyCredentials} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', fontSize: '1rem', fontWeight: '800' }}>
                {copied ? '✅ ¡Copiado al Portapapeles!' : '📋 Copiar Credenciales'}
              </button>
              <button onClick={() => setCreatedClientInfo(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', width: '100%', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                Entendido / Cerrar
              </button>
            </div>
          </div>
        </div>, document.body
      )}

    </div>
  );
}
