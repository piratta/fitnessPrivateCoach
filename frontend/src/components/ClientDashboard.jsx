import React, { useState, useRef, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import InitialQuestionnaire from './InitialQuestionnaire';
import { MOCK_ROUTINES } from '../utils/mockRoutines';
import { getChatMessages, addChatMessage } from '../utils/chatStore';
import { MOCK_CLIENTS } from '../utils/mockClients';
import { API_BASE_URL } from '../config';
import '../index.css';

export default function ClientDashboard({ user, onLogout }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [activeTab, setActiveTab] = useState('workout'); 
  const [clientData, setClientData] = useState(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [isModifyingReview, setIsModifyingReview] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState([0]);
  const [largePhotoView, setLargePhotoView] = useState(null);
  const [toggledPhoto, setToggledPhoto] = useState(false);
  const [largePhotoSource, setLargePhotoSource] = useState('pending');
  const [hasAcceptedEvaluation, setHasAcceptedEvaluation] = useState(false);
  const [expandedChart, setExpandedChart] = useState(null);

  const [progressHistory, setProgressHistory] = useState([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    logDate: new Date().toISOString().split('T')[0],
    weight: '',
    waist: '',
    hip: '',
    neck: '',
    biceps: '',
    leg: ''
  });

  const fetchProfile = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_BASE_URL}/api/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      let parsedRoutine = null;
      if (data.routineJson) {
        try {
          parsedRoutine = JSON.parse(data.routineJson);
        } catch (e) {
          console.error("Error parsing routineJson", e);
        }
      }
      const hasRoutine = !!(parsedRoutine && Object.keys(parsedRoutine).some(day => parsedRoutine[day] && parsedRoutine[day].length > 0));
      
      setClientData(prev => ({
        ...prev,
        ...data,
        routine: parsedRoutine,
        hasRoutine: hasRoutine
      }));
    })
    .catch(err => console.error("Error fetching profile", err));
  };

  const fetchProgressHistory = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_BASE_URL}/api/progress/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setProgressHistory(data);
      if (data.length > 0) {
        setSelectedMonths([Math.max(0, data.length - 1)]);
      } else {
        setSelectedMonths([0]);
      }
    })
    .catch(err => console.error("Error fetching progress history", err));
  };

  useEffect(() => {
    fetchProfile();
    fetchProgressHistory();
  }, [user, activeTab]);

  const getTimeScaleLabel = () => {
    if (!clientData?.reviewFrequency) return 'Mes';
    const freq = clientData.reviewFrequency.toLowerCase();
    if (freq.includes('semana')) return 'Semana';
    return 'Mes';
  };
  const timeScaleLabel = getTimeScaleLabel();
  const hasNextRoutine = clientData?.nextWorkout ? true : false;

  // Live Workout States
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [isWorkoutLocked, setIsWorkoutLocked] = useState(false);
  const [hasFinishedSession, setHasFinishedSession] = useState(false);
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [workoutSummary, setWorkoutSummary] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Review Form State
  const [reviewData, setReviewData] = useState({
    weight: '', waist: '', cadera: '', biceps: '', pierna: '', comments: '',
    photos: { front: '', left: '', right: '', back: '' }
  });

  const handlePhotoUpload = (view) => {
    // Simulate upload by setting a mock image URL
    setReviewData(prev => ({
      ...prev,
      photos: { ...prev.photos, [view]: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=400&q=80' }
    }));
  };

  // History State
  const [historyData, setHistoryData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      setIsLoadingHistory(true);
      const token = localStorage.getItem('token');
      fetch(`${API_BASE_URL}/api/workouts/history/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setHistoryData(data);
        setIsLoadingHistory(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoadingHistory(false);
      });
    }
  }, [activeTab]);

  // Timers Effect
  useEffect(() => {
    let interval = null;
    if (isWorkoutStarted && !isWorkoutLocked) {
      interval = setInterval(() => {
        setWorkoutSeconds(prev => prev + 1);
        setRestSeconds(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isWorkoutStarted, isWorkoutLocked]);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  // Workout Tracker States
  const routineDays = clientData?.routine ? Object.keys(clientData.routine) : [];
  const [selectedDay, setSelectedDay] = useState('');
  const [skippedDays, setSkippedDays] = useState({});

  const [comments, setComments] = useState({}); // { [day_exIdx]: string }
  const [videoLinks, setVideoLinks] = useState({});
  const [logs, setLogs] = useState({});

  // Initialize selectedDay when routine is loaded
  useEffect(() => {
    if (clientData?.routine) {
      const days = Object.keys(clientData.routine);
      if (days.length > 0 && !selectedDay) {
        setSelectedDay(days[0]);
      }
    }
  }, [clientData?.routine]);

  // Initialize logs dynamically when routine changes
  useEffect(() => {
    if (clientData?.routine) {
      const initialLogs = {};
      Object.keys(clientData.routine).forEach(day => {
        initialLogs[day] = {};
        const exercises = clientData.routine[day] || [];
        const sorted = [...exercises].sort((a, b) => (a.isOptional === b.isOptional ? 0 : a.isOptional ? 1 : -1));
        sorted.forEach((ex, exIdx) => {
          const match = ex.reps ? ex.reps.match(/(\d+)x(.*)/) : null;
          const setsCount = match ? parseInt(match[1]) : 3;
          const targetReps = match ? match[2].trim() : (ex.reps || '10');
          initialLogs[day][exIdx] = Array.from({ length: setsCount }).map(() => ({ weight: '', reps: targetReps, completed: false, skipped: false }));
        });
      });
      setLogs(initialLogs);
    }
  }, [clientData?.routine]);

  const activeWorkout = (clientData?.routine && selectedDay && clientData.routine[selectedDay])
    ? [...clientData.routine[selectedDay]].sort((a, b) => (a.isOptional === b.isOptional ? 0 : a.isOptional ? 1 : -1))
    : [];
  const currentLogs = (logs && selectedDay) ? logs[selectedDay] : null;
  const isDaySkipped = skippedDays[selectedDay];
  
  // Inline Editing State for Locked Workouts
  const [editingSets, setEditingSets] = useState({});
  const [editingExtras, setEditingExtras] = useState({});

  const [showChatModal, setShowChatModal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Fetch initial messages
  useEffect(() => {
    if (user?.email) {
      getChatMessages(user.email).then(msgs => setMessages(msgs));
    }
  }, [user?.email]);

  // Polling for new messages every 3 seconds
  useEffect(() => {
    if (!user?.email) return;
    const interval = setInterval(() => {
      getChatMessages(user.email).then(newMsgs => {
        setMessages(prev => {
          // If there are more messages than before, and modal is closed, increment unread
          if (!showChatModal && newMsgs.length > prev.length) {
             const added = newMsgs.length - prev.length;
             setUnreadMessages(unread => unread + added);
          }
          return newMsgs;
        });
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [user?.email, showChatModal]);

  // When opening modal, reset unread and fetch immediately
  useEffect(() => {
    if (showChatModal && user?.email) {
      setUnreadMessages(0);
      getChatMessages(user.email).then(msgs => setMessages(msgs));
    }
  }, [showChatModal, user?.email]);

  useEffect(() => {
    if (showChatModal && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showChatModal, messages]);

  // Progress States
  const [dailyWeight, setDailyWeight] = useState(78.5);
  const [chartType, setChartType] = useState('weight');
  const lastReviewDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); 
  const daysSinceReview = Math.floor((Date.now() - lastReviewDate) / (1000 * 60 * 60 * 24));
  const daysUntilNext = 7 - daysSinceReview;
  const isMeasurementsLocked = daysUntilNext > 0;

  const myStats = {
      weightHistory: [72.0, 72.8, 73.5, 74.0, 74.8, 75.5, 76.2, 77.0, 77.5, 78.0, 78.2, 78.5],
      adherenceHistory: [90, 85, 95, 90, 100, 80, 95, 90, 100, 100, 95, 95],
      volumeHistory: [4500, 4800, 5200, 5500, 5800, 6000, 6500, 7000, 7500, 7800, 8200, 8500],
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    const newLogs = { ...logs };
    if (field === 'weight') {
      const parsed = parseFloat(value);
      newLogs[selectedDay][exIdx][setIdx][field] = (parsed < 0) ? 0 : value;
    } else {
      newLogs[selectedDay][exIdx][setIdx][field] = value;
    }
    setLogs(newLogs);
  };

  const toggleComplete = (exIdx, setIdx) => {
    const newLogs = { ...logs };
    const currentSet = newLogs[selectedDay][exIdx][setIdx];
    
    // Prevent completing if weight is empty
    if (!currentSet.completed && (!currentSet.weight || currentSet.weight.toString().trim() === '')) {
      alert("⚠️ Por favor, introduce el peso levantado antes de marcar la serie como completada.");
      return;
    }

    const isNowCompleted = !currentSet.completed;
    currentSet.completed = isNowCompleted;
    setLogs(newLogs);
    
    if (isNowCompleted && isWorkoutStarted) {
      setRestSeconds(90); // 90 seconds rest timer
    }
  };

  const toggleSkipSet = (exIdx, setIdx) => {
    const newLogs = { ...logs };
    const currentSet = newLogs[selectedDay][exIdx][setIdx];
    currentSet.skipped = !currentSet.skipped;
    if (currentSet.skipped) currentSet.completed = false; // can't be completed and skipped
    setLogs(newLogs);
  };

  const toggleSkipExercise = (exIdx) => {
    const newLogs = { ...logs };
    const sets = newLogs[selectedDay][exIdx];
    const allSkipped = sets.every(s => s.skipped);
    sets.forEach(s => {
      s.skipped = !allSkipped;
      if (!allSkipped) s.completed = false;
    });
    setLogs(newLogs);
  };

  const toggleSkipDay = () => {
    setSkippedDays({ ...skippedDays, [selectedDay]: !isDaySkipped });
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const input = chatInput;
    setChatInput('');
    // Optimistic UI update could be added here, but we'll await the real response
    const updatedMessages = await addChatMessage(user.email, input);
    if (updatedMessages) {
      setMessages(prev => [...prev, updatedMessages]);
    }
  };

  const progress = isDaySkipped ? 100 : (Math.round((Object.values(currentLogs).flat().filter(s => s.completed || s.skipped).length / Object.values(currentLogs).flat().length) * 100) || 0);

  const handleFinishWorkout = async () => {
    const totalSets = Object.values(currentLogs).flat().length;
    const completedSets = Object.values(currentLogs).flat().filter(s => s.completed);
    
    if (completedSets.length === 0) {
      alert("⚠️ No has completado ninguna serie. Registra al menos una serie para poder finalizar el entrenamiento.");
      return;
    }

    const totalVolume = completedSets.reduce((sum, set) => sum + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0);
    const completionPercentage = Math.round((completedSets.length / totalSets) * 100);
    
    setWorkoutSummary({
      time: formatTime(workoutSeconds),
      volume: totalVolume,
      sets: completedSets.length,
      percentage: completionPercentage
    });

    try {
      const token = localStorage.getItem('token');
      const url = activeSessionId ? `${API_BASE_URL}/api/workouts/update/${activeSessionId}` : `${API_BASE_URL}/api/workouts/finish`;
      const method = activeSessionId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dayName: selectedDay,
          durationSeconds: workoutSeconds,
          totalVolume: totalVolume,
          completedSets: completedSets.length,
          completionPercentage: completionPercentage,
          logsJson: JSON.stringify(currentLogs), // Enviar solo los logs de este dia para no exceder limite, o de todos. Mejor todos
          commentsJson: JSON.stringify(comments),
          videoLinksJson: JSON.stringify(videoLinks)
        })
      });
      
      if (!activeSessionId && res.ok) {
        const newId = await res.text();
        setActiveSessionId(newId.replace(/"/g, ''));
      }
    } catch (e) {
      console.error("Error saving workout to backend", e);
    }

    setHasFinishedSession(true);
    setIsWorkoutStarted(false);
    setIsWorkoutLocked(true);
    setIsFinished(true);
  };

  const updateBackendSession = async (currentLogsToSave, currentCommentsToSave, currentLinksToSave) => {
    if (!activeSessionId) return;
    try {
      const totalSets = Object.values(currentLogsToSave[selectedDay] || currentLogsToSave).flat().length;
      const completedSets = Object.values(currentLogsToSave[selectedDay] || currentLogsToSave).flat().filter(s => s.completed);
      const totalVolume = completedSets.reduce((sum, set) => sum + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0);
      const completionPercentage = Math.round((completedSets.length / totalSets) * 100) || 0;

      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/workouts/update/${activeSessionId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dayName: selectedDay,
          durationSeconds: workoutSeconds,
          totalVolume: totalVolume,
          completedSets: completedSets.length,
          completionPercentage: completionPercentage,
          logsJson: JSON.stringify(currentLogsToSave),
          commentsJson: JSON.stringify(currentCommentsToSave),
          videoLinksJson: JSON.stringify(currentLinksToSave)
        })
      });
      
      setWorkoutSummary(prev => ({
        ...prev,
        volume: totalVolume,
        sets: completedSets.length,
        percentage: completionPercentage
      }));
    } catch (e) {
      console.error("Error updating workout", e);
    }
  };

  const handleSaveProgress = async (e) => {
    if (e) e.preventDefault();
    if (!logForm.logDate) {
      alert("Por favor, selecciona una fecha.");
      return;
    }
    if (!logForm.weight || logForm.weight.toString().trim() === '') {
      alert("Por favor, introduce al menos el peso.");
      return;
    }
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          logDate: logForm.logDate,
          weight: logForm.weight ? parseFloat(logForm.weight) : null,
          waist: logForm.waist ? parseFloat(logForm.waist) : null,
          hip: logForm.hip ? parseFloat(logForm.hip) : null,
          neck: logForm.neck ? parseFloat(logForm.neck) : null,
          biceps: logForm.biceps ? parseFloat(logForm.biceps) : null,
          leg: logForm.leg ? parseFloat(logForm.leg) : null
        })
      });
      if (response.ok) {
        alert("Medición registrada con éxito.");
        setShowLogModal(false);
        setLogForm({
          logDate: new Date().toISOString().split('T')[0],
          weight: '',
          waist: '',
          hip: '',
          neck: '',
          biceps: '',
          leg: ''
        });
        fetchProgressHistory();
      } else {
        alert("Error al registrar la medición.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red.");
    }
  };

  const handleStartWorkout = () => {
    if (hasFinishedSession) {
      if (!window.confirm("Ya has completado un entrenamiento en esta sesión. ¿Estás seguro de que quieres volver a empezar?")) {
        return;
      }
      setHasFinishedSession(false);
      setWorkoutSeconds(0);
      setRestSeconds(0);
    }
    setIsWorkoutStarted(true);
  };

  const progressDates = progressHistory.map(l => {
    if (!l.logDate) return '';
    const parts = l.logDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return l.logDate;
  });

  const weightHistory = progressHistory.length > 0 ? progressHistory.map(l => l.weight || 0) : (clientData?.weightHistory || [0]);
  const waistHistory = progressHistory.length > 0 ? progressHistory.map(l => l.waist || 0) : (clientData?.waistHistory || [0]);
  const caderaHistory = progressHistory.length > 0 ? progressHistory.map(l => l.hip || 0) : (clientData?.caderaHistory || [0]);
  const cuelloHistory = progressHistory.length > 0 ? progressHistory.map(l => l.neck || 0) : (clientData?.cuelloHistory || [0]);
  const bicepsHistory = progressHistory.length > 0 ? progressHistory.map(l => l.biceps || 0) : (clientData?.bicepsHistory || [0]);
  const piernaHistory = progressHistory.length > 0 ? progressHistory.map(l => l.leg || 0) : (clientData?.piernaHistory || [0]);
  const volumeHistory = clientData?.volumeHistory || [4500, 4800, 5200, 5500, 5800, 6000, 6500, 7000, 7500, 7800, 8200, 8500];
  const adherenceHistory = clientData?.adherenceHistory || [90, 85, 95, 90, 100, 80, 95, 90, 100, 100, 95, 95];

  const renderChart = (type = chartType) => {
    let history = [];
    let color = 'var(--accent-primary)';
    let unit = '';
    let title = '';

    if (type === 'weight') {
      history = weightHistory;
      unit = 'kg';
      title = 'Evolución del Peso Corporal';
    } else if (type === 'adherence') {
      history = adherenceHistory;
      unit = '%';
      title = 'Cumplimiento de Rutina';
      color = '#00f2fe'; // Azul Neón
    } else if (type === 'waist') {
      history = waistHistory;
      unit = 'cm';
      title = 'Perímetro de Cintura';
      color = '#ff0844'; // Rojo Neón
    } else if (type === 'cadera') {
      history = caderaHistory;
      unit = 'cm';
      title = 'Perímetro de Cadera';
      color = '#bb00ff'; // Morado Neón
    } else if (type === 'cuello') {
      history = cuelloHistory;
      unit = 'cm';
      title = 'Perímetro de Cuello';
      color = '#00ff88'; // Verde Neón
    } else if (type === 'biceps') {
      history = bicepsHistory;
      unit = 'cm';
      title = 'Perímetro de Bíceps';
      color = '#ff00aa'; // Rosa Neón
    } else if (type === 'pierna') {
      history = piernaHistory;
      unit = 'cm';
      title = 'Perímetro de Pierna';
      color = '#00d2ff'; // Cian Oscuro Neón
    } else if (type === 'volume') {
      history = volumeHistory;
      unit = 'kg';
      title = 'Volumen Total Levantado';
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
              <linearGradient id={`grad-client-${type}`} x1="0" y1="0" x2="0" y2="1">
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
            <path d={areaPath} fill={`url(#grad-client-${type})`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0px 8px 12px ${color}40)` }} />
            
            {/* Points and Labels */}
            {history.map((val, index) => {
              let label = `Mes ${index + 1}`;
              if (type !== 'adherence' && type !== 'volume' && progressDates[index]) {
                label = progressDates[index];
              } else if ((type === 'adherence' || type === 'volume') && clientData?.reviewFrequency) {
                const labelType = clientData.reviewFrequency.toLowerCase().includes('semana') ? 'Semana' : 'Mes';
                label = `${labelType} ${index + 1}`;
              }
              return (
                <g key={index} style={{ transition: 'all 0.3s' }}>
                  <circle cx={getX(index)} cy={getY(val)} r="8" fill="#0a0a0c" stroke={color} strokeWidth="3" style={{ cursor: 'pointer' }} />
                  <text x={getX(index)} y={getY(val) - 20} fill={color} fontSize="16" fontWeight="800" textAnchor="middle" fontFamily="Outfit" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{val}{unit}</text>
                  <text x={getX(index)} y={svgHeight - 5} fill="var(--text-muted)" fontSize="13" fontWeight="600" textAnchor="middle" textTransform="uppercase" fontFamily="Outfit" letterSpacing="1px">{label}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: '90px' }}>
      
      {/* Header Cliente */}
      <header className="glass-panel no-print mobile-header" style={{ position: 'sticky', top: '10px', zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', margin: '10px 20px', borderRadius: '12px', backdropFilter: 'blur(15px)' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
            PRVT<span style={{ color: 'var(--accent-primary)' }}>FITNESS</span>
          </h2>
        </div>
        <div className="mobile-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {isWorkoutStarted && (
            <div style={{ display: 'flex', gap: '10px' }}>
              {restSeconds > 0 && (
                <div style={{ background: 'rgba(255, 170, 0, 0.2)', color: '#ffaa00', padding: '5px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  ⏳ {formatTime(restSeconds)}
                </div>
              )}
              <div style={{ background: 'rgba(0, 230, 118, 0.2)', color: '#00e676', padding: '5px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                ⏱️ {formatTime(workoutSeconds)}
              </div>
            </div>
          )}
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{user.name.split(' ')[0]}</p>
          </div>
          <button onClick={() => { setShowChatModal(true); setUnreadMessages(0); }} style={{ position: 'relative', background: 'var(--accent-primary)', border: 'none', color: '#000', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '1.2rem', boxShadow: '0 0 10px rgba(224,248,0,0.3)' }}>
            💬
            {unreadMessages > 0 && (
              <span style={{
                position: 'absolute', top: '-8px', right: '-8px',
                background: '#ff4500', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold',
                borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
              }}>
                {unreadMessages}
              </span>
            )}
          </button>
          {!isWorkoutStarted && (
            <button onClick={onLogout} style={{ background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: '600', fontSize: '0.8rem' }}>Salir</button>
          )}
        </div>
      </header>

      {/* Notificación Evaluación Recibida */}
      {clientData?.lastCompletedReview && !showEvaluationModal && !hasAcceptedEvaluation && (
        <div 
          onClick={() => setShowEvaluationModal(true)}
          style={{ 
            margin: '20px', padding: '15px', background: 'rgba(224, 248, 0, 0.15)', border: '1px solid var(--accent-primary)', 
            borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(224, 248, 0, 0.1)'
          }}
        >
          <div>
            <h4 style={{ color: 'var(--accent-primary)', margin: '0 0 5px 0' }}>🎉 ¡Evaluación de Revisión Recibida!</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)' }}>Tu entrenador ha analizado tus fotos y medidas. Haz clic para ver el feedback.</p>
          </div>
          <span style={{ fontSize: '1.5rem' }}>👉</span>
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, padding: '0 20px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        {!hasCompletedOnboarding ? (
          <InitialQuestionnaire onComplete={() => setHasCompletedOnboarding(true)} />
        ) : (
          <div className="fade-in">
            
            {/* Pestaña: ENTRENAR */}
            {activeTab === 'workout' && (
              !clientData?.hasRoutine ? (
                <div className="glass-panel fade-in" style={{ padding: '60px 20px', textAlign: 'center', marginTop: '20px', borderTop: '4px solid var(--accent-primary)' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏋️‍♂️</div>
                  <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '10px', color: '#fff' }}>Sin Rutina Asignada</h3>
                  <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 20px auto', lineHeight: '1.6' }}>
                    Tu entrenador aún está preparando tu plan de entrenamiento personalizado. ¡Te notificaremos tan pronto como esté listo!
                  </p>
                  <div style={{ display: 'inline-block', padding: '10px 20px', background: 'rgba(224, 248, 0, 0.1)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    Frecuencia de revisión: {clientData?.reviewFrequency || 'Semanal'}
                  </div>
                </div>
              ) : (
                <div>
                
                {/* Estrategia asignada */}
                <div style={{ background: 'rgba(224, 248, 0, 0.05)', border: '1px dashed var(--accent-primary)', padding: '10px 15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>🎯</span>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Objetivo de Pesos Semanal</div>
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.95rem' }}>{user.progressionStrategy || "Sobrecarga Progresiva (Subir peso)"}</div>
                  </div>
                </div>

                {/* Selector de Días */}
                <div className="scrollable-tabs" style={{ marginBottom: '15px', borderBottom: '1px solid var(--border-light)' }}>
                  {routineDays.map(day => (
                    <button 
                      key={day} 
                      onClick={() => setSelectedDay(day)}
                      style={{ 
                        padding: '10px 20px', whiteSpace: 'nowrap', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.3s',
                        background: selectedDay === day ? 'var(--accent-primary)' : 'transparent',
                        color: selectedDay === day ? '#000' : 'var(--text-muted)',
                        border: selectedDay === day ? '1px solid var(--accent-primary)' : '1px solid var(--border-light)'
                      }}
                    >
                      {day.split(' - ')[0]}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: '800' }}>{selectedDay}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {!isDaySkipped && (
                      <>
                        <span style={{ fontSize: '1.5rem', fontWeight: '800', color: progress === 100 ? 'var(--accent-primary)' : '#fff' }}>{progress}%</span>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Completado</p>
                      </>
                    )}
                  </div>
                </div>

                {!isDaySkipped && (
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginBottom: '30px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--accent-primary)', width: `${progress}%`, transition: 'width 0.4s ease-out', boxShadow: '0 0 10px var(--accent-primary)' }}></div>
                  </div>
                )}

                {/* Botón Saltar Día */}
                {!isWorkoutStarted && (
                  <button onClick={toggleSkipDay} style={{ width: '100%', padding: '15px', background: isDaySkipped ? 'rgba(255,255,255,0.05)' : 'rgba(255, 69, 0, 0.1)', border: isDaySkipped ? '1px solid var(--border-light)' : '1px solid #ff4500', color: isDaySkipped ? 'var(--text-main)' : '#ff4500', borderRadius: '8px', marginBottom: '25px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
                    {isDaySkipped ? '↩️ Deshacer Descanso y Entrenar' : '🛋️ Marcar día como Descanso'}
                  </button>
                )}

                {isDaySkipped ? (
                  <div className="glass-panel fade-in" style={{ padding: '40px 20px', textAlign: 'center', borderTop: '4px solid #00f2fe' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🔋</div>
                    <h3 style={{ color: '#00f2fe', marginBottom: '10px' }}>Día de Recuperación</h3>
                    <p style={{ color: 'var(--text-muted)' }}>El descanso es donde ocurre la magia. Aliméntate bien y prepárate para la próxima sesión. ¡Buen trabajo!</p>
                  </div>
                ) : (
                  <div className="fade-in" style={{ display: 'grid', gap: '25px' }}>
                    {!isWorkoutStarted && !isWorkoutLocked ? (
                      <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <button 
                          onClick={handleStartWorkout} 
                          className="btn-primary" 
                          style={{ padding: '25px 40px', fontSize: '1.5rem', borderRadius: '50px', boxShadow: '0 10px 30px rgba(224, 248, 0, 0.3)' }}
                        >
                          ▶ EMPEZAR ENTRENAMIENTO
                        </button>
                        <p style={{ marginTop: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Pulsa para activar el cronómetro y registrar marcas.</p>
                      </div>
                    ) : (
                      <>
                        {isWorkoutLocked && (
                          <div style={{ background: 'rgba(255, 170, 0, 0.1)', border: '1px solid #ffaa00', padding: '15px', borderRadius: '8px', marginBottom: '10px', textAlign: 'center' }}>
                            <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '5px' }}>🔒 Entrenamiento Completado</span>
                            <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '15px' }}>El tiempo ha sido registrado. Puedes modificar series individualmente usando el botón ✏️.</p>
                            
                            {workoutSummary && (
                              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Tiempo</div>
                                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>{workoutSummary.time}</div>
                                </div>
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Volumen</div>
                                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>{workoutSummary.volume} kg</div>
                                </div>
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Series</div>
                                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>{workoutSummary.sets}</div>
                                </div>
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Cumplido</div>
                                  <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>{workoutSummary.percentage}%</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {activeWorkout.map((exercise, exIdx) => {
                          const stateKey = `${selectedDay}_${exIdx}`;
                          // Mock history string for visual demonstration
                          const historyMocks = ["80kg x 10 (RIR 1)", "60kg x 12 (RIR 2)", "20kg x 15 (RIR 1)", "100kg x 8 (RIR 2)", "15kg x 15 (RIR 0)"];
                          const historyMock = historyMocks[exIdx % historyMocks.length];

                          return (
                            <div key={exIdx} className="glass-panel" style={{ padding: '20px', borderLeft: exercise.isOptional ? '4px solid #ffaa00' : '4px solid var(--accent-primary)', background: 'rgba(20, 20, 24, 0.8)' }}>
                              <div style={{ marginBottom: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <h4 style={{ fontSize: '1.2rem', fontWeight: '800', lineHeight: '1.2', flex: 1, paddingRight: '15px', textDecoration: currentLogs[exIdx].every(s => s.skipped) ? 'line-through' : 'none', color: currentLogs[exIdx].every(s => s.skipped) ? 'var(--text-muted)' : '#fff' }}>{exercise.name}</h4>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button onClick={() => toggleSkipExercise(exIdx)} disabled={isWorkoutLocked} style={{ background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', cursor: isWorkoutLocked ? 'not-allowed' : 'pointer' }}>🚫 OMITIR</button>
                                    {exercise.isOptional && <span style={{ background: 'rgba(255, 170, 0, 0.1)', color: '#ffaa00', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>OPCIONAL</span>}
                                  </div>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: '5px' }}>⏱️ Última vez: {historyMock}</div>
                                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>🎯 Objetivo: <strong style={{ color: '#fff' }}>{exercise.reps}</strong></span>
                                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>🔥 Int: <strong style={{ color: '#fff' }}>{exercise.intensity}</strong></span>
                                </div>
                                {exercise.notes && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px' }}>📝 {exercise.notes}</p>}
                              </div>

                              {/* Tracker */}
                              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px' }}>
                                <div className="tracker-grid" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 100px', gap: '10px', padding: '10px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                  <div style={{ textAlign: 'center' }}>Set</div><div style={{ textAlign: 'center' }}>kg</div><div style={{ textAlign: 'center' }}>Reps</div><div style={{ textAlign: 'center' }}>Acciones</div>
                                </div>
                                {currentLogs[exIdx].map((set, setIdx) => {
                                  const isEditing = editingSets[`${exIdx}-${setIdx}`];
                                  const inputDisabled = (!isEditing && (set.completed || set.skipped || isWorkoutLocked));
                                  
                                  return (
                                    <div key={setIdx} className="tracker-grid" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 100px', gap: '10px', padding: '12px 15px', background: set.completed ? 'rgba(224, 248, 0, 0.03)' : (set.skipped ? 'rgba(255,255,255,0.02)' : 'transparent'), opacity: set.skipped ? 0.5 : 1, transition: 'all 0.3s' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: set.completed ? 'var(--accent-primary)' : 'var(--text-muted)', textDecoration: set.skipped ? 'line-through' : 'none' }}>{setIdx + 1}</div>
                                      <div><input type="number" min="0" className="tracker-input" step="0.5" value={set.weight} onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)} disabled={inputDisabled} style={{ width: '100%', padding: '10px', background: isEditing ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', border: isEditing ? '1px solid var(--accent-primary)' : 'none', borderRadius: '6px', color: '#fff', textAlign: 'center', textDecoration: set.skipped ? 'line-through' : 'none' }} /></div>
                                      <div><input type="text" className="tracker-input" placeholder={set.reps} value={set.reps} onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)} disabled={inputDisabled} style={{ width: '100%', padding: '10px', background: isEditing ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', border: isEditing ? '1px solid var(--accent-primary)' : 'none', borderRadius: '6px', color: '#fff', textAlign: 'center', textDecoration: set.skipped ? 'line-through' : 'none' }} /></div>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                        {isWorkoutLocked ? (
                                          isEditing ? (
                                            <button onClick={() => {
                                              setEditingSets({...editingSets, [`${exIdx}-${setIdx}`]: false});
                                              updateBackendSession(logs, comments, videoLinks);
                                            }} style={{ width: '75px', height: '35px', borderRadius: '6px', background: 'var(--accent-primary)', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>💾 Guardar</button>
                                          ) : (
                                            <button onClick={() => setEditingSets({...editingSets, [`${exIdx}-${setIdx}`]: true})} style={{ width: '75px', height: '35px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.8rem' }}>✏️ Modificar</button>
                                          )
                                        ) : (
                                          <>
                                            <button onClick={() => toggleComplete(exIdx, setIdx)} disabled={set.skipped} style={{ width: '35px', height: '35px', borderRadius: '50%', background: set.completed ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', border: set.completed ? 'none' : '1px solid rgba(255,255,255,0.2)', color: set.completed ? '#000' : 'rgba(255,255,255,0.2)', cursor: set.skipped ? 'not-allowed' : 'pointer' }}>✓</button>
                                            <button onClick={() => toggleSkipSet(exIdx, setIdx)} style={{ width: '35px', height: '35px', borderRadius: '50%', background: set.skipped ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>🚫</button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              {/* Coach Correlation Features */}
                              <div style={{ display: 'grid', gap: '10px' }}>
                                {isWorkoutLocked && (
                                  <div style={{ textAlign: 'right', marginBottom: '-5px' }}>
                                    {editingExtras[exIdx] ? (
                                      <button onClick={() => {
                                        setEditingExtras({...editingExtras, [exIdx]: false});
                                        updateBackendSession(logs, comments, videoLinks);
                                      }} style={{ padding: '4px 10px', borderRadius: '6px', background: 'var(--accent-primary)', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}>💾 Guardar Notas</button>
                                    ) : (
                                      <button onClick={() => setEditingExtras({...editingExtras, [exIdx]: true})} style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.75rem' }}>✏️ Modificar Notas</button>
                                    )}
                                  </div>
                                )}
                                <input type="text" placeholder="Añadir comentario (ej. molestias, sensaciones...)" value={comments[stateKey] || ''} onChange={(e) => setComments({...comments, [stateKey]: e.target.value})} disabled={isWorkoutLocked && !editingExtras[exIdx]} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.02)', border: (isWorkoutLocked && !editingExtras[exIdx]) ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--accent-primary)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }} />
                                <input type="text" placeholder="🔗 Pegar link de video para revisión de técnica (Opcional)" value={videoLinks[stateKey] || ''} onChange={(e) => setVideoLinks({...videoLinks, [stateKey]: e.target.value})} disabled={isWorkoutLocked && !editingExtras[exIdx]} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.02)', border: (isWorkoutLocked && !editingExtras[exIdx]) ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--accent-primary)', borderRadius: '6px', color: 'var(--accent-primary)', fontSize: '0.85rem' }} />
                                {comments[`coach_${stateKey}`] && (
                                  <div style={{ padding: '12px', background: 'rgba(224, 248, 0, 0.05)', border: '1px dashed var(--accent-primary)', borderRadius: '6px', color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
                                    <strong>👨‍🏫 Feedback del Entrenador:</strong> {comments[`coach_${stateKey}`]}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        {!isWorkoutLocked ? (
                          <div style={{ marginTop: '30px', marginBottom: '20px' }}>
                            <button onClick={handleFinishWorkout} className="btn-primary" style={{ width: '100%', padding: '20px', fontSize: '1.2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>🏁 FINALIZAR ENTRENAMIENTO</button>
                          </div>
                        ) : (
                          <div style={{ marginTop: '30px', marginBottom: '20px' }}>
                            <button onClick={() => {
                              if(window.confirm('¿Seguro que quieres volver a empezar este entrenamiento desde cero? Perderás los registros no guardados de esta sesión.')) {
                                setIsWorkoutLocked(false);
                                setIsWorkoutStarted(false);
                                setWorkoutSeconds(0);
                                setRestSeconds(0);
                              }
                            }} style={{ width: '100%', padding: '15px', background: 'transparent', border: '1px solid #ff4500', color: '#ff4500', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>🔁 Volver a realizar entreno</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              )
            )}

            {/* Pestaña: PROGRESO */}
            {activeTab === 'progress' && (
              <div className="fade-in">
                <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '20px' }}>Mi Progreso</h3>

                <div className="glass-panel" style={{ padding: '25px', marginBottom: '25px' }}>
                  <h4 style={{ color: 'var(--accent-primary)', marginBottom: '15px' }}>⚖️ Registro Diario</h4>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="number" step="0.1" value={dailyWeight} onChange={(e) => setDailyWeight(e.target.value)} style={{ width: '100px', padding: '15px', fontSize: '1.5rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: '#fff', textAlign: 'center' }} />
                    <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>kg</span>
                    <button 
                      onClick={async () => {
                        if (!dailyWeight || dailyWeight.toString().trim() === '') {
                          alert("Por favor, introduce un peso válido.");
                          return;
                        }
                        const token = localStorage.getItem('token');
                        try {
                          const response = await fetch(`${API_BASE_URL}/api/progress`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                              logDate: new Date().toISOString().split('T')[0],
                              weight: parseFloat(dailyWeight)
                            })
                          });
                          if (response.ok) {
                            alert("Peso diario guardado con éxito.");
                            fetchProgressHistory();
                          } else {
                            alert("Error al guardar el peso.");
                          }
                        } catch (err) {
                          console.error(err);
                          alert("Error de red.");
                        }
                      }}
                      style={{ marginLeft: 'auto', padding: '12px 20px', background: 'var(--accent-primary)', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Guardar Peso
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
                  <button 
                    onClick={() => setShowLogModal(true)} 
                    className="btn-primary" 
                    style={{ flex: 1, padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold' }}
                  >
                    📅 Registrar Medidas Históricas / Pasadas
                  </button>
                </div>



                <div className="glass-panel" style={{ padding: '25px', marginBottom: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ color: 'var(--accent-primary)', margin: 0 }}>📊 Comparativa de Medidas</h4>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {selectedMonths.map((monthIdx, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <select 
                            className="input-field" 
                            style={{ padding: '5px', margin: 0 }}
                            value={monthIdx}
                            onChange={(e) => {
                              const newMonths = [...selectedMonths];
                              newMonths[i] = parseInt(e.target.value);
                              setSelectedMonths(newMonths);
                            }}
                          >
                            {weightHistory.map((_, idx) => (
                              <option key={idx} value={idx}>{idx === weightHistory.length - 1 ? 'Actual' : (progressDates[idx] ? progressDates[idx] : `${timeScaleLabel} ${idx + 1}`)}</option>
                            ))}
                          </select>
                          {selectedMonths.length > 2 && (
                            <button 
                              onClick={() => setSelectedMonths(selectedMonths.filter((_, filterIdx) => filterIdx !== i))}
                              style={{ background: 'transparent', border: 'none', color: '#ff4500', cursor: 'pointer' }}
                            >✕</button>
                          )}
                        </div>
                      ))}
                      {selectedMonths.length < 3 && weightHistory.length > 0 && (
                        <button 
                          onClick={() => {
                            const minSelected = Math.min(...selectedMonths);
                            const nextToAdd = Math.max(0, minSelected - 1);
                            if (!selectedMonths.includes(nextToAdd)) {
                                setSelectedMonths([...selectedMonths, nextToAdd]);
                            } else {
                                const available = weightHistory.map((_, i) => i).filter(i => !selectedMonths.includes(i));
                                if (available.length > 0) setSelectedMonths([...selectedMonths, available[available.length - 1]]);
                            }
                          }}
                          style={{ background: 'rgba(224, 248, 0, 0.1)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', padding: '5px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          + Comparar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden' }}>
                      <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <tr>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Métrica</th>
                          {selectedMonths.map((m, i) => (
                            <Fragment key={i}>
                              <th style={{ padding: '12px' }}>{m === weightHistory.length - 1 ? 'Actual' : (progressDates[m] ? progressDates[m] : `${timeScaleLabel} ${m + 1}`)}</th>
                              {i < selectedMonths.length - 1 && (
                                <th style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dif.</th>
                              )}
                            </Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: 'Peso Corpor.', key: 'weight', data: weightHistory, unit: 'kg', lowerIsBetter: clientData?.goal === 'Pérdida de Grasa' },
                          { label: 'Cintura', key: 'waist', data: waistHistory, unit: 'cm', lowerIsBetter: true },
                          { label: 'Cadera', key: 'cadera', data: caderaHistory, unit: 'cm', lowerIsBetter: true },
                          { label: 'Cuello', key: 'cuello', data: cuelloHistory, unit: 'cm', lowerIsBetter: false },
                          { label: 'Bíceps', key: 'biceps', data: bicepsHistory, unit: 'cm', lowerIsBetter: false },
                          { label: 'Pierna', key: 'pierna', data: piernaHistory, unit: 'cm', lowerIsBetter: false },
                        ].map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>{row.label}</td>
                            {selectedMonths.map((m, i) => {
                              const currentVal = row.data[m];
                              const nextVal = selectedMonths[i+1] !== undefined ? row.data[selectedMonths[i+1]] : null;
                              
                              let diffColor = 'var(--text-muted)';
                              let diffText = '-';
                              
                              if (currentVal !== undefined && nextVal !== undefined) {
                                const diff = parseFloat((nextVal - currentVal).toFixed(2));
                                if (diff > 0) {
                                  diffColor = row.lowerIsBetter ? '#ff4500' : '#00e676';
                                  diffText = `+${diff}`;
                                } else if (diff < 0) {
                                  diffColor = row.lowerIsBetter ? '#00e676' : '#ff4500';
                                  diffText = `${diff}`;
                                } else {
                                  diffText = '=';
                                }
                              }

                              return (
                                <Fragment key={i}>
                                  <td style={{ padding: '12px' }}>{currentVal !== undefined ? `${currentVal}${row.unit}` : '-'}</td>
                                  {i < selectedMonths.length - 1 && (
                                    <td style={{ padding: '12px', color: diffColor, fontWeight: 'bold', fontSize: '0.9rem' }}>
                                      {diffText}
                                    </td>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>


                <div className="glass-panel" style={{ padding: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h4 style={{ color: 'var(--text-main)' }}>Gráficas de Evolución</h4>
                  </div>
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
            )}

            {/* Pestaña: HISTORIAL */}
            {activeTab === 'history' && (
              <div className="fade-in">
                <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '20px' }}>Historial Pasado</h3>
                {isLoadingHistory ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Cargando historial...</div>
                ) : historyData.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>No hay entrenamientos registrados todavía.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '15px' }}>
                    {historyData.map((session) => (
                      <div key={session.id} onClick={() => {
                        setActiveSessionId(session.id);
                        if (session.logsJson) {
                           try { setLogs(JSON.parse(session.logsJson)); } catch(e){}
                        }
                        if (session.commentsJson) {
                           try { setComments(JSON.parse(session.commentsJson)); } catch(e){}
                        }
                        if (session.videoLinksJson) {
                           try { setVideoLinks(JSON.parse(session.videoLinksJson)); } catch(e){}
                        }
                        setSelectedDay(session.dayName);
                        setWorkoutSeconds(session.durationSeconds || 0);
                        setWorkoutSummary({
                          time: formatTime(session.durationSeconds || 0),
                          volume: session.totalVolume,
                          sets: session.completedSets,
                          percentage: session.completionPercentage
                        });
                        setIsWorkoutStarted(false);
                        setIsWorkoutLocked(true);
                        setHasFinishedSession(true);
                        setActiveTab('workout');
                      }} className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                        <div>
                          <h4 style={{ color: '#fff', marginBottom: '5px' }}>{session.dayName}</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{session.sessionDate} • Completado {session.completionPercentage}%</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'block', fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{session.totalVolume} kg</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Volumen</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pestaña: PRÓXIMA RUTINA */}
            {activeTab === 'next_workout' && (
              <div className="fade-in">
                <div style={{ background: 'rgba(255, 170, 0, 0.1)', border: '1px dashed #ffaa00', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '5px' }}>⏳ Rutina Programada</span>
                  <p style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Esta rutina está planificada para el próximo mesociclo. Modo consulta.</p>
                </div>

                <div className="scrollable-tabs" style={{ marginBottom: '15px', borderBottom: '1px solid var(--border-light)' }}>
                  {routineDays.map(day => (
                    <button 
                      key={day} 
                      onClick={() => setSelectedDay(day)}
                      style={{ 
                        padding: '10px 20px', whiteSpace: 'nowrap', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.3s',
                        background: selectedDay === day ? '#ffaa00' : 'transparent',
                        color: selectedDay === day ? '#000' : 'var(--text-muted)',
                        border: selectedDay === day ? '1px solid #ffaa00' : '1px solid var(--border-light)'
                      }}
                    >
                      {day.split(' - ')[0]}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: '800' }}>{selectedDay}</h3>
                </div>

                <div style={{ display: 'grid', gap: '15px' }}>
                  {activeWorkout.map((ex, exIdx) => (
                    <div key={exIdx} className="glass-panel" style={{ padding: '20px', opacity: 0.8 }}>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '5px' }}>{ex.name} {ex.isOptional && <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', marginLeft: '5px' }}>Opcional</span>}</h4>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        <span>🎯 {ex.reps}</span>
                        <span>🔥 {ex.intensity}</span>
                      </div>
                      {ex.notes && (
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                          💡 {ex.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pestaña: REVISIÓN */}
            {activeTab === 'review' && (
              <div className="fade-in">
                {clientData?.pendingReviewData && !isModifyingReview ? (
                  <>
                    <div style={{ background: 'rgba(224, 248, 0, 0.1)', border: '1px solid var(--accent-primary)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                      <h3 style={{ color: 'var(--accent-primary)', marginBottom: '5px' }}>✅ Revisión {timeScaleLabel} Enviada</h3>
                      <p style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Tu entrenador está evaluando tus progresos. Recibirás una notificación cuando haya terminado.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                      {['front', 'left', 'right', 'back'].map(view => {
                        const photoUrl = clientData.pendingReviewData.photos?.[view];
                        const labels = { front: 'Frontal', left: 'Lat. Izq.', right: 'Lat. Der.', back: 'Espalda' };
                        return photoUrl ? (
                          <div key={view} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div 
                              onClick={() => {
                                setLargePhotoView(view);
                                setToggledPhoto(false);
                                setLargePhotoSource('pending');
                              }}
                              style={{ aspectRatio: '3/4', background: `url(${photoUrl}) center/cover`, borderRadius: '8px', cursor: 'pointer' }} 
                            />
                            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{labels[view]}</div>
                          </div>
                        ) : null;
                      })}
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                      <p style={{ margin: 0 }}><strong>Peso:</strong> {clientData.pendingReviewData.weight}kg | <strong>Cintura:</strong> {clientData.pendingReviewData.waist}cm</p>
                      <p style={{ margin: '5px 0 0 0', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-muted)' }}>"{clientData.pendingReviewData.comments}"</p>
                    </div>
                    <button 
                      className="btn-primary" 
                      style={{ width: '100%', padding: '15px', fontSize: '1.1rem', background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}
                      onClick={() => {
                        setReviewData(clientData.pendingReviewData);
                        setIsModifyingReview(true);
                      }}
                    >
                      ✏️ Modificar Envío
                    </button>
                  </>
                ) : clientData?.lastCompletedReview && isMeasurementsLocked ? (
                  <>
                    <div style={{ background: 'rgba(0, 230, 118, 0.1)', border: '1px solid #00e676', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                      <h3 style={{ color: '#00e676', marginBottom: '5px' }}>✅ Evaluación Recibida</h3>
                      <p style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Tu entrenador ha analizado tu última revisión. Revisa el feedback a continuación.</p>
                    </div>
                    <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
                      <h4 style={{ color: 'var(--accent-primary)', marginBottom: '10px' }}>💬 Comentario Global</h4>
                      <p style={{ fontStyle: 'italic', lineHeight: '1.5' }}>"{clientData.lastCompletedReview.globalFeedback}"</p>
                    </div>

                    <h4 style={{ marginBottom: '10px' }}>📊 Progreso de Medidas</h4>
                    <div className="glass-panel" style={{ padding: '15px', marginBottom: '20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                        {(() => {
                          const getReviewDiff = (key, dataHistory) => {
                            const current = clientData.lastCompletedReview[key];
                            if (current === undefined || !dataHistory || dataHistory.length < 2) return { current };
                            const previous = dataHistory[dataHistory.length - 2]; // assuming the last is the current one
                            const diff = current - previous;
                            return { current, diff: diff.toFixed(1) };
                          };
                          const weightData = getReviewDiff('weight', clientData.weightHistory);
                          const waistData = getReviewDiff('waist', clientData.waistHistory);
                          const caderaData = getReviewDiff('cadera', clientData.caderaHistory);
                          const cuelloData = getReviewDiff('cuello', clientData.cuelloHistory);
                          const bicepsData = getReviewDiff('biceps', clientData.bicepsHistory);
                          const piernaData = getReviewDiff('pierna', clientData.piernaHistory);
                          
                          const renderCard = (label, data, unit, lowerIsBetter) => {
                            if (!data || data.current === undefined) return null;
                            const isGood = lowerIsBetter ? data.diff < 0 : data.diff > 0;
                            const diffColor = data.diff == 0 ? 'var(--text-muted)' : (isGood ? '#00e676' : '#ff1744');
                            const diffSymbol = data.diff < 0 ? '▼' : (data.diff > 0 ? '▲' : '=');
                            
                            return (
                              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{data.current} {unit}</div>
                                {data.diff !== undefined && (
                                  <div style={{ fontSize: '0.8rem', color: diffColor, marginTop: '5px' }}>
                                    {diffSymbol} {Math.abs(data.diff)} {unit}
                                  </div>
                                )}
                              </div>
                            );
                          };
                          
                          return (
                            <>
                              {renderCard('Peso', weightData, 'kg', true)}
                              {renderCard('Cintura', waistData, 'cm', true)}
                              {renderCard('Cadera', caderaData, 'cm', true)}
                              {renderCard('Cuello', cuelloData, 'cm', true)}
                              {renderCard('Bíceps', bicepsData, 'cm', false)}
                              {renderCard('Pierna', piernaData, 'cm', false)}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <h4 style={{ marginBottom: '10px' }}>📸 Tus Fotos Evaluadas</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                      {['front', 'left', 'right', 'back'].map(view => {
                        const photoUrl = clientData.lastCompletedReview.photos?.[view];
                        const hasDrawing = !!clientData.lastCompletedReview.drawings?.[view];
                        const labels = { front: 'Frontal', left: 'Lat. Izq.', right: 'Lat. Der.', back: 'Espalda' };
                        return photoUrl ? (
                          <div key={view} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div 
                              onClick={() => {
                                setLargePhotoView(view);
                                setToggledPhoto(false);
                                setLargePhotoSource('completed');
                              }}
                              style={{ 
                                aspectRatio: '3/4', 
                                background: hasDrawing ? `url(${clientData.lastCompletedReview.drawings[view]}) center/cover no-repeat, url(${photoUrl}) center/cover no-repeat` : `url(${photoUrl}) center/cover no-repeat`, 
                                borderRadius: '8px', 
                                cursor: 'pointer', 
                                border: hasDrawing ? '2px solid #ffaa00' : 'none' 
                              }} 
                            >
                            </div>
                            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{labels[view]}</div>
                          </div>
                        ) : null;
                      })}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '20px' }}>(Haz clic en las fotos para ver en grande y leer los comentarios específicos)</p>
                  </>
                ) : (
                  <>
                    <div style={{ background: 'rgba(224, 248, 0, 0.1)', border: '1px solid var(--accent-primary)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                      <h3 style={{ color: 'var(--accent-primary)', marginBottom: '5px' }}>📝 Preparar Revisión {timeScaleLabel}</h3>
                      <p style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Envía tus medidas y fotos actuales a tu entrenador para que pueda evaluar tu progreso y ajustar tu próxima rutina.</p>
                    </div>
                    
                    <h4 style={{ marginBottom: '10px' }}>Tus Medidas Actuales</h4>
                    <div className="responsive-grid-2" style={{ gap: '10px' }}>
                      <input type="number" placeholder="Peso (kg)" className="input-field" style={{ margin: 0 }} value={reviewData.weight} onChange={e => setReviewData({...reviewData, weight: e.target.value})} />
                      <input type="number" placeholder="Cintura (cm)" className="input-field" style={{ margin: 0 }} value={reviewData.waist} onChange={e => setReviewData({...reviewData, waist: e.target.value})} />
                      <input type="number" placeholder="Cadera (cm)" className="input-field" style={{ margin: 0 }} value={reviewData.cadera} onChange={e => setReviewData({...reviewData, cadera: e.target.value})} />
                      <input type="number" placeholder="Cuello (cm)" className="input-field" style={{ margin: 0 }} value={reviewData.cuello} onChange={e => setReviewData({...reviewData, cuello: e.target.value})} />
                      <input type="number" placeholder="Bíceps (cm)" className="input-field" style={{ margin: 0 }} value={reviewData.biceps} onChange={e => setReviewData({...reviewData, biceps: e.target.value})} />
                      <input type="number" placeholder="Pierna (cm)" className="input-field" style={{ margin: 0 }} value={reviewData.pierna} onChange={e => setReviewData({...reviewData, pierna: e.target.value})} />
                    </div>

                <h4 style={{ margin: '20px 0 10px 0' }}>Tus Fotos (Haz clic para subir)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '20px' }}>
                  {['front', 'left', 'right', 'back'].map(view => {
                    const labels = { front: 'Frontal', left: 'Lateral Izq.', right: 'Lateral Der.', back: 'Espalda' };
                    return (
                      <div 
                        key={view}
                        onClick={() => handlePhotoUpload(view)}
                        style={{
                          aspectRatio: '3/4',
                          background: reviewData.photos[view] ? `url(${reviewData.photos[view]}) center/cover` : 'rgba(255,255,255,0.05)',
                          border: '2px dashed var(--border-light)',
                          borderRadius: '8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          color: 'var(--text-muted)'
                        }}
                      >
                        {!reviewData.photos[view] && labels[view]}
                      </div>
                    )
                  })}
                </div>

                <h4 style={{ marginBottom: '10px' }}>Comentarios adicionales</h4>
                <textarea 
                  className="input-field" 
                  style={{ width: '100%', minHeight: '100px', resize: 'vertical' }} 
                  placeholder="¿Cómo te has sentido esta semana? ¿Alguna molestia o sugerencia?"
                  value={reviewData.comments}
                  onChange={e => setReviewData({...reviewData, comments: e.target.value})}
                ></textarea>

                <button 
                  className="btn-primary" 
                  style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.1rem' }}
                  onClick={() => {
                    const requiredFields = ['weight', 'waist', 'cadera', 'cuello', 'biceps', 'pierna'];
                    const isFormValid = requiredFields.every(field => reviewData[field] !== undefined && reviewData[field] !== '');
                    if (!isFormValid) {
                      alert('Por favor, rellena todas las medidas requeridas (Peso, Cintura, Cadera, Cuello, Bíceps, Pierna) antes de enviar la revisión.');
                      return;
                    }
                    
                    alert('¡Revisión enviada a tu entrenador con éxito!');
                    setClientData({ ...clientData, pendingReviewData: { ...reviewData } });
                    setIsModifyingReview(false);
                    setActiveTab('workout');
                  }}
                >
                  📤 Enviar Revisión
                </button>
                {isModifyingReview && (
                  <button 
                    style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.1rem', background: 'transparent', border: '1px solid #ff4500', color: '#ff4500', borderRadius: '8px', cursor: 'pointer' }}
                    onClick={() => setIsModifyingReview(false)}
                  >
                    Cancelar Edición
                  </button>
                )}
                </>
              )}

                {/* Revisiones Anteriores */}
                {clientData?.lastCompletedReview && (
                  <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '15px' }}>📅 Historial de Revisiones</h3>
                    <div className="glass-panel" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowEvaluationModal(true)}>
                      <div>
                        <h4 style={{ color: '#fff', marginBottom: '5px' }}>Revisión del {clientData.lastCompletedReview.reviewDate}</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Evaluada por tu entrenador</p>
                      </div>
                      <div style={{ color: 'var(--accent-primary)', fontSize: '1.5rem' }}>👁️</div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Mobile Navigation */}
      {hasCompletedOnboarding && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px', background: 'rgba(10, 10, 12, 0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 500 }}>
          <button onClick={() => setActiveTab('workout')} style={{ background: 'transparent', border: 'none', color: activeTab === 'workout' ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <span style={{ fontSize: '1.5rem' }}>🏋️</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Entrenar</span>
          </button>
          <button onClick={() => setActiveTab('progress')} style={{ background: 'transparent', border: 'none', color: activeTab === 'progress' ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <span style={{ fontSize: '1.5rem' }}>📈</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Progreso</span>
          </button>
          <button onClick={() => setActiveTab('history')} style={{ background: 'transparent', border: 'none', color: activeTab === 'history' ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <span style={{ fontSize: '1.5rem' }}>📅</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Historial</span>
          </button>
          <button onClick={() => setActiveTab('review')} style={{ background: 'transparent', border: 'none', color: activeTab === 'review' ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <span style={{ fontSize: '1.5rem' }}>📷</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Revisión</span>
          </button>
          {hasNextRoutine && (
            <button onClick={() => setActiveTab('next_workout')} style={{ background: 'transparent', border: 'none', color: activeTab === 'next_workout' ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <span style={{ fontSize: '1.5rem' }}>⏭️</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Próxima</span>
            </button>
          )}
        </nav>
      )}

      {/* Chat Modal */}
      {showChatModal && createPortal(
        <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Chat con Antonio (Entrenador)</h3>
              <button onClick={() => setShowChatModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button>
            </div>
            
            <div className="custom-scrollbar" style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{ alignSelf: msg.sender === 'client' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  <div style={{ background: msg.sender === 'client' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', color: msg.sender === 'client' ? '#000' : '#fff', padding: '12px 16px', borderRadius: msg.sender === 'client' ? '12px 12px 0 12px' : '12px 12px 12px 0', fontSize: '0.95rem' }}>
                    {msg.text}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block', textAlign: msg.sender === 'client' ? 'right' : 'left' }}>{msg.time}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div style={{ padding: '15px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '10px' }}>
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Escribe a tu entrenador..." style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: '25px', color: '#fff', fontFamily: 'Outfit' }} />
              <button onClick={handleSendMessage} style={{ background: 'var(--accent-primary)', border: 'none', width: '45px', height: '45px', borderRadius: '50%', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➤</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* Modal Finalizar */}
      {isFinished && createPortal(
        <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.9)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '40px', textAlign: 'center', borderTop: '4px solid var(--accent-primary)' }}>
            <div style={{ fontSize: '5rem', marginBottom: '20px' }}>{workoutSummary?.percentage === 100 ? '🔥' : '💪'}</div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '15px', color: 'var(--accent-primary)' }}>
              {workoutSummary?.percentage === 100 ? '¡BRUTAL!' : '¡SIGAMOS MEJORANDO!'}
            </h2>
            <p style={{ color: 'var(--text-main)', fontSize: '1.2rem', marginBottom: '5px' }}>
              Has completado el {workoutSummary?.percentage}% de tu {selectedDay}.
            </p>
            
            {workoutSummary && (
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-around', margin: '20px 0' }}>
                <div>
                  <div style={{ color: 'var(--accent-primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>{workoutSummary.time}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TIEMPO</div>
                </div>
                <div>
                  <div style={{ color: 'var(--accent-primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>{workoutSummary.volume}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>VOLUMEN (KG)</div>
                </div>
                <div>
                  <div style={{ color: 'var(--accent-primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>{workoutSummary.sets}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SERIES</div>
                </div>
              </div>
            )}

            <button className="btn-primary" style={{ width: '100%', padding: '15px', fontSize: '1.2rem', marginTop: '20px' }} onClick={() => setIsFinished(false)}>
              Ver Resumen
            </button>
          </div>
        </div>, document.body
      )}

      {/* Modal Evaluación Recibida */}
      {showEvaluationModal && clientData?.lastCompletedReview && createPortal(
        <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 3000, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', background: 'rgba(20,20,24,0.98)', padding: '25px', position: 'relative' }}>
            <button onClick={() => setShowEvaluationModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#ff4500', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            
            <h2 style={{ color: 'var(--accent-primary)', marginBottom: '20px' }}>Resultados de la Evaluación</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>Fecha: {clientData.lastCompletedReview.reviewDate}</p>

            {clientData.lastCompletedReview.globalFeedback && (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '30px', borderLeft: '4px solid var(--accent-primary)' }}>
                <h4 style={{ marginBottom: '10px' }}>💭 Comentario del Entrenador</h4>
                <p style={{ fontSize: '1rem', fontStyle: 'italic', lineHeight: '1.5', whiteSpace: 'pre-line' }}>"{clientData.lastCompletedReview.globalFeedback}"</p>
              </div>
            )}

            <h4 style={{ marginBottom: '15px' }}>📸 Correcciones Fotográficas</h4>
            <div style={{ display: 'grid', gap: '20px' }}>
              {['front', 'left', 'right', 'back'].map(view => {
                const photoComment = clientData.lastCompletedReview.photoComments?.[view];
                const drawingUrl = clientData.lastCompletedReview.drawings?.[view];
                const originalUrl = clientData.lastCompletedReview.photos?.[view];
                const labels = { front: 'Frontal', left: 'Lateral Izq.', right: 'Lateral Der.', back: 'Espalda' };

                if (!photoComment && !drawingUrl && !originalUrl) return null;

                return (
                  <div key={view} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '15px', display: 'flex', gap: '15px', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                      <div 
                        onClick={() => {
                          setLargePhotoView(view);
                          setToggledPhoto(false);
                          setLargePhotoSource('completed');
                        }}
                        style={{ 
                          width: '120px', height: '160px', 
                          background: originalUrl ? `url(${originalUrl}) center/contain no-repeat` : 'rgba(255,255,255,0.05)',
                          borderRadius: '8px', position: 'relative', cursor: 'pointer' 
                        }}
                      >
                        {/* Overlay drawing if it exists */}
                        {drawingUrl && (
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: `url(${drawingUrl}) center/contain no-repeat`, pointerEvents: 'none' }} />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h5 style={{ color: 'var(--text-muted)', marginBottom: '5px' }}>Vista {labels[view]}</h5>
                        {photoComment ? (
                          <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{photoComment}</p>
                        ) : (
                          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Sin comentarios específicos</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              className="btn-primary" 
              style={{ width: '100%', marginTop: '30px', padding: '15px', fontSize: '1.1rem' }}
              onClick={() => {
                setShowEvaluationModal(false);
                setHasAcceptedEvaluation(true);
              }}
            >
              Aceptar Evaluación
            </button>
          </div>
        </div>, document.body
      )}
      
      {/* Modal Visor de Foto (Cliente) */}
      {largePhotoView && createPortal(
        (() => {
          const sourceData = largePhotoSource === 'completed' ? clientData?.lastCompletedReview : clientData?.pendingReviewData;
          const pastPhotoUrl = sourceData?.pastPhotos?.[largePhotoView];
          const currentPhotoUrl = sourceData?.photos?.[largePhotoView];
          const currentDrawingUrl = largePhotoSource === 'completed' ? sourceData?.drawings?.[largePhotoView] : null;

          return (
            <div className="fade-in" style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)',
              zIndex: 4000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px'
            }}>
              <button onClick={() => setLargePhotoView(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#ff4500', fontSize: '2rem', cursor: 'pointer', zIndex: 4001 }}>✕</button>
              
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', zIndex: 4001 }}>
                <button 
                  onClick={() => setToggledPhoto(false)}
                  style={{ background: !toggledPhoto ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', color: !toggledPhoto ? '#000' : '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                  Foto Actual
                </button>
                <button 
                  onClick={() => setToggledPhoto(true)}
                  disabled={!pastPhotoUrl}
                  style={{ background: toggledPhoto ? '#ffaa00' : 'rgba(255,255,255,0.1)', color: toggledPhoto ? '#000' : 'rgba(255,255,255,0.3)', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: pastPhotoUrl ? 'pointer' : 'not-allowed', transition: 'all 0.3s' }}
                >
                  Foto Anterior
                </button>
              </div>

              <div style={{ width: '100%', maxWidth: '600px', height: '70vh', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                {toggledPhoto ? (
                  <div style={{ width: '100%', height: '100%', background: `url(${pastPhotoUrl}) center/contain no-repeat`, transition: 'opacity 0.3s ease-in-out' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: `url(${currentPhotoUrl}) center/contain no-repeat` }} />
                    {currentDrawingUrl && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: `url(${currentDrawingUrl}) center/contain no-repeat`, pointerEvents: 'none' }} />
                    )}
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Estás viendo: {toggledPhoto ? 'Mes Anterior' : 'Mes Actual'}
              </div>
            </div>
          );
        })(), document.body
      )}

      {/* Modal Registrar Medidas Pasadas */}
      {showLogModal && createPortal(
        <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <form onSubmit={handleSaveProgress} className="glass-panel" style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>Registrar Medidas Pasadas</h3>
              <button type="button" onClick={() => setShowLogModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Fecha de la Medición</label>
                <input type="date" required value={logForm.logDate} onChange={e => setLogForm({...logForm, logDate: e.target.value})} className="input-field" style={{ colorScheme: 'dark', margin: 0, width: '100%' }} />
              </div>

              <div className="responsive-grid-2" style={{ gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Peso (kg) *</label>
                  <input type="number" step="0.1" required placeholder="Ej. 78.5" value={logForm.weight} onChange={e => setLogForm({...logForm, weight: e.target.value})} className="input-field" style={{ margin: 0, width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Cintura (cm)</label>
                  <input type="number" step="0.1" placeholder="Ej. 84.0" value={logForm.waist} onChange={e => setLogForm({...logForm, waist: e.target.value})} className="input-field" style={{ margin: 0, width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Cadera (cm)</label>
                  <input type="number" step="0.1" placeholder="Ej. 98.0" value={logForm.hip} onChange={e => setLogForm({...logForm, hip: e.target.value})} className="input-field" style={{ margin: 0, width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Cuello (cm)</label>
                  <input type="number" step="0.1" placeholder="Ej. 38.0" value={logForm.neck} onChange={e => setLogForm({...logForm, neck: e.target.value})} className="input-field" style={{ margin: 0, width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Bíceps (cm)</label>
                  <input type="number" step="0.1" placeholder="Ej. 36.5" value={logForm.biceps} onChange={e => setLogForm({...logForm, biceps: e.target.value})} className="input-field" style={{ margin: 0, width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Pierna (cm)</label>
                  <input type="number" step="0.1" placeholder="Ej. 58.0" value={logForm.leg} onChange={e => setLogForm({...logForm, leg: e.target.value})} className="input-field" style={{ margin: 0, width: '100%' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
              <button type="button" onClick={() => setShowLogModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border-light)', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
              <button type="submit" style={{ flex: 2, padding: '12px', background: 'var(--accent-primary)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Guardar Medidas</button>
            </div>
          </form>
        </div>,
        document.body
      )}

    </div>
  );
}
