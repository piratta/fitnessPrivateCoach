import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import WorkoutBuilder from './WorkoutBuilder';
import ReviewManager from './ReviewManager';
import { getClientBillingStatus } from '../utils/statusUtils';

   
// eslint-disable-next-line no-unused-vars
export default function ClientDetailView({ clientId, user, onLogout, onBack }) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resumen');
  
  // Data for WorkoutBuilder & ReviewManager & Stats
  const [templates, setTemplates] = useState([]);
  const [progressHistory, setProgressHistory] = useState([]);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [chartType, setChartType] = useState('weight');

  useEffect(() => {
    if (!clientId) return;
    
    const fetchClientData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      try {
        // Fetch all clients to find ours (since there's no single-client endpoint yet)
        const clientsRes = await fetch(`${API_BASE_URL}/api/users/clients`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let found = null;
        if (clientsRes.ok) {
          const allClients = await clientsRes.json();
          found = allClients.find(c => c.id === clientId);
          if (found) {
            // Rehydrate routine JSONs
            setClient({
              ...found,
              routine: found.routineJson ? JSON.parse(found.routineJson) : null,
              nextRoutine: found.nextRoutineJson ? JSON.parse(found.nextRoutineJson) : null
            });
          }
        }
        
        // Fetch templates for WorkoutBuilder
        const templatesRes = await fetch(`${API_BASE_URL}/api/templates`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (templatesRes.ok) {
          const tData = await templatesRes.json();
          setTemplates(tData.map(t => ({
            ...t,
            routine: t.routineJson ? JSON.parse(t.routineJson) : null
          })));
        }

        // Fetch progress history for the client
        if (client?.email || found?.email) {
            const email = found?.email || client.email;
            const historyRes = await fetch(`${API_BASE_URL}/api/progress/history/by-email/${email}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (historyRes.ok) {
              const logs = await historyRes.json();
              setProgressHistory(logs);
            }
        }

        // Fetch workout history for the client
        const workoutRes = await fetch(`${API_BASE_URL}/api/workouts/history/${clientId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (workoutRes.ok) {
          const wData = await workoutRes.json();
          setWorkoutHistory(wData);
        }
      } catch {
  // eslint-disable-next-line no-undef
        console.error("Error fetching client details:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (loading) {
    return <div style={{ padding: '40px', color: 'white', textAlign: 'center' }}>Cargando expediente del cliente...</div>;
  }

  if (!client) {
    return <div style={{ padding: '40px', color: 'white', textAlign: 'center' }}>Cliente no encontrado.</div>;
  }

  const clientFullName = `${client.name} ${client.lastName || ''}`.trim();
  const statusInfo = getClientBillingStatus(client);

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

  const renderChart = (type = chartType) => {
    let history = [];
    let color = 'var(--accent-primary)';
    let unit = '';
    let title = '';

    if (type === 'weight') {
      history = progressHistory.map(l => l.weight).filter(w => w !== null);
      if (history.length === 0) history = [client.currentWeight || 0];
      unit = 'kg';
      title = 'Evolución del Peso Corporal';
    } else if (type === 'waist') {
      history = progressHistory.map(l => l.waist).filter(w => w !== null);
      unit = 'cm';
      title = 'Perímetro de Cintura';
      color = '#ff0844';
    } else if (type === 'cadera') {
      history = progressHistory.map(l => l.hip).filter(w => w !== null);
      unit = 'cm';
      title = 'Perímetro de Cadera';
      color = '#bb00ff';
    } else if (type === 'volume') {
      history = workoutHistory.map(w => w.totalVolume || 0).reverse();
      unit = 'kg';
      title = 'Volumen Total Levantado (Sobrecarga Progresiva)';
      color = '#ffaa00';
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
      <div className="fade-in" style={{ marginTop: '20px' }}>
        <h4 style={{ color: 'white', textAlign: 'center', marginBottom: '25px', fontWeight: '800', fontSize: '1.4rem' }}>{title}</h4>
        <div style={{ background: 'rgba(10,10,12,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '30px 20px 10px', position: 'relative', overflowX: 'visible', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={color} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map(factor => {
               const y = svgHeight - paddingY - factor * (svgHeight - paddingY * 2);
               return <line key={factor} x1={paddingX - 10} y1={y} x2={svgWidth - paddingX + 10} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
            })}
            <path d={areaPath} fill={`url(#grad-${type})`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0px 8px 12px ${color}40)` }} />
            {history.map((val, index) => {
              const getLabel = () => {
                if (type === 'volume' && workoutHistory[workoutHistory.length - 1 - index]) {
                  const dateStr = workoutHistory[workoutHistory.length - 1 - index].sessionDate;
                  if (dateStr) {
                    const parts = dateStr.split('-');
                    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
                  }
                } else if (progressHistory[index]) {
                  const dateStr = progressHistory[index].logDate;
                  const parts = dateStr.split('-');
                  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
                }
                return `S ${index + 1}`;
              };
              return (
                <g key={index} style={{ transition: 'all 0.3s' }}>
                  <circle cx={getX(index)} cy={getY(val)} r="8" fill="#0a0a0c" stroke={color} strokeWidth="3" style={{ cursor: 'pointer' }} />
                  <text x={getX(index)} y={getY(val) - 20} fill={color} fontSize="16" fontWeight="800" textAnchor="middle" fontFamily="Outfit" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{val}{unit}</text>
                  <text x={getX(index)} y={svgHeight - 5} fill="var(--text-muted)" fontSize="13" fontWeight="600" textAnchor="middle" textTransform="uppercase" fontFamily="Outfit" letterSpacing="1px">{getLabel()}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Back Button */}
      <button 
        onClick={() => onBack ? onBack() : window.location.href = '/'} 
        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 'bold', transition: 'color 0.2s' }}
        onMouseOver={(e) => e.target.style.color = 'var(--accent-primary)'}
        onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}
      >
        ← Volver al panel de clientes
      </button>

      {/* Header */}
      <header className="glass-panel mobile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', margin: 0, color: 'var(--accent-primary)' }}>
            {clientFullName}
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: '5px 0 0 0', fontSize: '1rem' }}>
            {client.email} • Objetivo: {client.goal || 'No definido'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
            <span style={{ 
                padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold',
                background: client.status === 'Activo' ? 'rgba(224, 248, 0, 0.1)' : 'rgba(255, 69, 0, 0.1)',
                color: client.status === 'Activo' ? 'var(--accent-primary)' : '#ff4500'
            }}>
                {client.status}
            </span>
            {client.status === 'Activo' && (
                <p style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{statusInfo.text}</p>
            )}
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="scrollable-tabs" style={{ marginBottom: '30px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={navItemStyle('resumen')} onClick={() => setActiveTab('resumen')}>Resumen</div>
        <div style={navItemStyle('entrenamientos')} onClick={() => setActiveTab('entrenamientos')}>Entrenamientos</div>
        <div style={navItemStyle('historial')} onClick={() => setActiveTab('historial')}>Historial / Stats</div>
        <div style={navItemStyle('revisiones')} onClick={() => setActiveTab('revisiones')}>Revisiones</div>
      </div>

      {/* Tab Content */}
      <div className="fade-in">
        {activeTab === 'resumen' && (
          <div className="glass-panel" style={{ padding: '30px' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '20px' }}>Resumen del Cliente</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Peso Inicial</p>
                <h4 style={{ fontSize: '1.5rem', marginTop: '5px' }}>{progressHistory[0]?.weight || client.currentWeight || 'N/A'} kg</h4>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Frecuencia de Revisión</p>
                <h4 style={{ fontSize: '1.5rem', marginTop: '5px' }}>{client.reviewFrequency || 'Semanal'}</h4>
              </div>
            </div>
            
            <h4 style={{ marginTop: '30px', marginBottom: '15px', color: 'var(--text-muted)' }}>Estrategias y Consideraciones</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {(client.strategies || []).map((strat, idx) => (
                <li key={idx} style={{ padding: '10px 15px', background: 'rgba(255,255,255,0.05)', marginBottom: '10px', borderRadius: '8px' }}>
                  {strat}
                </li>
              ))}
              {(!client.strategies || client.strategies.length === 0) && (
                <li style={{ color: 'var(--text-muted)' }}>No hay estrategias definidas para este cliente.</li>
              )}
            </ul>
          </div>
        )}

        {activeTab === 'entrenamientos' && (
          <div>
             <WorkoutBuilder 
               clients={[client]} 
               templates={templates} 
               isTemplateMode={false} 
               initialClient={clientFullName}
               setClients={(updateFn) => {
                 // Hack to handle setClients state update for just one client
                 const newArray = typeof updateFn === 'function' ? updateFn([client]) : updateFn;
                 if (newArray && newArray.length > 0) {
                   setClient(newArray[0]);
                 }
               }} 
               setTemplates={setTemplates} 
             />
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="glass-panel" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.4rem' }}>Evolución y Estadísticas</h3>
                <select 
                    className="input-field" 
                    style={{ marginBottom: 0, width: '200px' }}
                    value={chartType} 
                    onChange={(e) => setChartType(e.target.value)}
                >
                    <option value="weight">Peso Corporal</option>
                    <option value="waist">Cintura</option>
                    <option value="cadera">Cadera</option>
                    <option value="volume">Volumen de Entreno</option>
                </select>
            </div>
            
            {renderChart()}

            <h3 style={{ fontSize: '1.4rem', marginTop: '40px', marginBottom: '20px' }}>Últimos Entrenamientos</h3>
            {workoutHistory.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>El cliente aún no ha completado entrenamientos.</p>
            ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                    {workoutHistory.slice(0, 10).map((session) => (
                        <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div>
                                <h4 style={{ color: 'var(--accent-primary)', fontSize: '1.1rem', marginBottom: '4px' }}>{session.dayName}</h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{session.sessionDate}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontWeight: 'bold' }}>{session.totalVolume} kg</p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{Math.floor(session.durationSeconds / 60)} min • {session.completedSets} series</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}

        {activeTab === 'revisiones' && (
          <div>
            <ReviewManager clients={[client]} setClients={(updateFn) => {
                 const newArray = typeof updateFn === 'function' ? updateFn([client]) : updateFn;
                 if (newArray && newArray.length > 0) setClient(newArray[0]);
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
