import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import SearchableExerciseSelect from './SearchableExerciseSelect';
import { useDialog } from './ui/Dialog';
import { API_BASE_URL } from '../config';
import '../index.css';

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const parseRoutineJson = (routineSource) => {
  const emptyRoutine = {
    Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []
  };
  const emptyNotes = {
    Lunes: '', Martes: '', Miércoles: '', Jueves: '', Viernes: '', Sábado: '', Domingo: ''
  };
  
  if (!routineSource) {
    return { exercises: emptyRoutine, notes: emptyNotes };
  }
  
  try {
    const parsed = typeof routineSource === 'string' ? JSON.parse(routineSource) : routineSource;
    const exercises = {};
    const notes = {};
    DAYS_OF_WEEK.forEach(day => {
      exercises[day] = Array.isArray(parsed[day]) ? parsed[day] : [];
      notes[day] = parsed[`${day}_notes`] || '';
    });
    return { exercises, notes };
  } catch (e) {
    console.error("Error parsing routineJson", e);
    return { exercises: emptyRoutine, notes: emptyNotes };
  }
};

export default function WorkoutBuilder({ clients = [], templates = [], isTemplateMode = false, editingTemplate = null, initialClient = '', setClients, setTemplates, setActiveTab }) {
  const dialog = useDialog();
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateTitle, setTemplateTitle] = useState(editingTemplate ? editingTemplate.title : '');
  const [templateDescription, setTemplateDescription] = useState(editingTemplate ? editingTemplate.description : '');
  const [periodStr, setPeriodStr] = useState('');
  const [routineStartDate, setRoutineStartDate] = useState(new Date().toISOString().split('T')[0]);
  const defaultEndDate = () => {
    const d = new Date(); d.setDate(d.getDate() + 28);
    return d.toISOString().split('T')[0];
  };
  const [routineEndDate, setRoutineEndDate] = useState(defaultEndDate());
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [assignAs, setAssignAs] = useState('current');
  const lastLoadedRef = useRef({ clientName: '', assignAs: '', templateId: '' });

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowClientDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownRef]);

  // Estado para la rutina organizada por días
  const [weeklyRoutine, setWeeklyRoutine] = useState(() => {
    if (editingTemplate) {
      const { exercises } = parseRoutineJson(editingTemplate.routineJson || editingTemplate.routine);
      return exercises;
    }
    return {
      Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []
    };
  });

  const [activeDay, setActiveDay] = useState('Lunes');
  const [selectedClient, setSelectedClient] = useState(initialClient);
  const [dailyNotes, setDailyNotes] = useState(() => {
    if (editingTemplate) {
      const { notes } = parseRoutineJson(editingTemplate.routineJson || editingTemplate.routine);
      return notes;
    }
    return {
      Lunes: '', Martes: '', Miércoles: '', Jueves: '', Viernes: '', Sábado: '', Domingo: ''
    };
  });

  useEffect(() => {
    const currentTemplateId = editingTemplate ? editingTemplate.id : '';
    
    if (isTemplateMode) {
      if (lastLoadedRef.current.templateId !== currentTemplateId) {
        lastLoadedRef.current = { clientName: '', assignAs: '', templateId: currentTemplateId };
        if (editingTemplate) {
          const { exercises, notes } = parseRoutineJson(editingTemplate.routineJson || editingTemplate.routine);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setWeeklyRoutine(exercises);
          setDailyNotes(notes);
          setTemplateTitle(editingTemplate.title || '');
          setTemplateDescription(editingTemplate.description || '');
        } else {
          setWeeklyRoutine({
            Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []
          });
          setDailyNotes({
            Lunes: '', Martes: '', Miércoles: '', Jueves: '', Viernes: '', Sábado: '', Domingo: ''
          });
          setTemplateTitle('');
          setTemplateDescription('');
        }
      }
    } else {
      if (selectedClient) {
        if (lastLoadedRef.current.clientName !== selectedClient || lastLoadedRef.current.assignAs !== assignAs) {
          lastLoadedRef.current = { clientName: selectedClient, assignAs: assignAs, templateId: '' };
          const clientObj = clients.find(c => `${c.name} ${c.lastName || ''}`.trim() === selectedClient);
          if (clientObj) {
            const routineSource = assignAs === 'next' ? clientObj.nextRoutineJson : clientObj.routineJson;
            const { exercises, notes } = parseRoutineJson(routineSource);
            setWeeklyRoutine(exercises);
            setDailyNotes(notes);
            // Pre-populate routine date range from existing client data
            if (clientObj.routineStartDate) setRoutineStartDate(clientObj.routineStartDate);
            if (clientObj.routineEndDate) setRoutineEndDate(clientObj.routineEndDate);
          } else {
            setWeeklyRoutine({
              Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []
            });
            setDailyNotes({
              Lunes: '', Martes: '', Miércoles: '', Jueves: '', Viernes: '', Sábado: '', Domingo: ''
            });
          }
        }
      } else {
        if (lastLoadedRef.current.clientName !== '') {
          lastLoadedRef.current = { clientName: '', assignAs: 'current', templateId: '' };
          setWeeklyRoutine({
            Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []
          });
          setDailyNotes({
            Lunes: '', Martes: '', Miércoles: '', Jueves: '', Viernes: '', Sábado: '', Domingo: ''
          });
        }
      }
    }
  }, [selectedClient, clients, isTemplateMode, assignAs, editingTemplate]);

  const addExercise = (day) => {
    setWeeklyRoutine({
      ...weeklyRoutine,
      [day]: [...weeklyRoutine[day], { name: '', reps: '', intensity: '', notes: '', expectedWeight: '', isOptional: false, sets: undefined }]
    });
  };

  const updateExercise = (day, index, field, value) => {
    const newDayRoutine = [...weeklyRoutine[day]];
    newDayRoutine[index][field] = value;
    setWeeklyRoutine({
      ...weeklyRoutine,
      [day]: newDayRoutine
    });
  };

  /**
   * Expands the "NxM" quick syntax (e.g. "3x10") into an array of N identical sets so the
   * coach can switch to the per-set editor without losing what they already typed. If the
   * exercise already has detailed sets we keep them.
   */
  const enableDetailedSets = (day, index) => {
    const newDayRoutine = [...weeklyRoutine[day]];
    const ex = newDayRoutine[index];
    if (Array.isArray(ex.sets) && ex.sets.length > 0) return;
    const match = ex.reps ? ex.reps.match(/^\s*(\d+)\s*x\s*(.+)\s*$/) : null;
    const count = match ? parseInt(match[1]) : 3;
    const targetReps = match ? match[2].trim() : (ex.reps || '10');
    ex.sets = Array.from({ length: count }).map(() => ({ reps: targetReps, intensity: ex.intensity || '', notes: '' }));
    setWeeklyRoutine({ ...weeklyRoutine, [day]: newDayRoutine });
  };

  const disableDetailedSets = (day, index) => {
    const newDayRoutine = [...weeklyRoutine[day]];
    const ex = newDayRoutine[index];
    if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
      ex.sets = undefined;
    } else {
      // Try to compress N identical sets back into the "NxM" shortcut.
      const first = ex.sets[0];
      const allSame = ex.sets.every(s => s.reps === first.reps && (s.intensity || '') === (first.intensity || ''));
      if (allSame) {
        ex.reps = `${ex.sets.length}x${first.reps}`;
        if (first.intensity) ex.intensity = first.intensity;
      }
      ex.sets = undefined;
    }
    setWeeklyRoutine({ ...weeklyRoutine, [day]: newDayRoutine });
  };

  const updateSet = (day, exIndex, setIndex, field, value) => {
    const newDayRoutine = [...weeklyRoutine[day]];
    const ex = newDayRoutine[exIndex];
    if (!Array.isArray(ex.sets)) return;
    ex.sets = ex.sets.map((s, i) => i === setIndex ? { ...s, [field]: value } : s);
    setWeeklyRoutine({ ...weeklyRoutine, [day]: newDayRoutine });
  };

  const addSet = (day, exIndex) => {
    const newDayRoutine = [...weeklyRoutine[day]];
    const ex = newDayRoutine[exIndex];
    if (!Array.isArray(ex.sets)) ex.sets = [];
    const last = ex.sets[ex.sets.length - 1] || { reps: '10', intensity: ex.intensity || '', notes: '' };
    ex.sets = [...ex.sets, { reps: last.reps, intensity: last.intensity || '', notes: '' }];
    setWeeklyRoutine({ ...weeklyRoutine, [day]: newDayRoutine });
  };

  const removeSet = (day, exIndex, setIndex) => {
    const newDayRoutine = [...weeklyRoutine[day]];
    const ex = newDayRoutine[exIndex];
    if (!Array.isArray(ex.sets)) return;
    ex.sets = ex.sets.filter((_, i) => i !== setIndex);
    setWeeklyRoutine({ ...weeklyRoutine, [day]: newDayRoutine });
  };

  const removeExercise = (day, index) => {
    const newDayRoutine = weeklyRoutine[day].filter((_, i) => i !== index);
    setWeeklyRoutine({
      ...weeklyRoutine,
      [day]: newDayRoutine
    });
  };

  const exportToExcel = () => {
    let csvContent = "\uFEFF"; // BOM para que Excel lea los tildes correctamente
    csvContent += "Día,Ejercicio,Series x Reps,Intensidad,Notas,Opcional\n";

    Object.keys(weeklyRoutine).forEach(day => {
      weeklyRoutine[day].forEach(ex => {
        const row = [
          day,
          `"${ex.name}"`,
          `"${ex.reps}"`,
          `"${ex.intensity}"`,
          `"${ex.notes}"`,
          ex.isOptional ? "Sí" : "No"
        ].join(",");
        csvContent += row + "\n";
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Rutina_Semanal.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel" style={{ padding: '30px' }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>Planificador Semanal de Rutinas</h3>
      
      {isTemplateMode ? (
        <div className="responsive-flex" style={{ marginBottom: '30px', display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Nombre de la Plantilla</label>
            <input type="text" className="input-field" placeholder="Ej. Hipertrofia 4 Días" value={templateTitle} onChange={e => setTemplateTitle(e.target.value)} />
          </div>
          <div style={{ flex: '2 1 280px', minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Descripción Breve</label>
            <input type="text" className="input-field" placeholder="Ej. Frecuencia 2 Torso/Pierna con énfasis en brazos" value={templateDescription} onChange={e => setTemplateDescription(e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="responsive-flex" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '30px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Cliente a asignar</label>
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <input 
                className="input-field" 
                placeholder="Escribe el nombre del cliente..." 
                value={selectedClient} 
                onChange={(e) => {
                  setSelectedClient(e.target.value);
                  setShowClientDropdown(true);
                }}
                onFocus={() => setShowClientDropdown(true)}
                style={{ cursor: 'text', width: '100%', marginBottom: 0 }}
              />
              {showClientDropdown && (
                <div style={{ 
                  position: 'absolute', top: '100%', left: 0, right: 0, 
                  background: 'var(--bg-panel)', border: '1px solid var(--border-light)', 
                  borderRadius: '6px', marginTop: '5px', maxHeight: '200px', overflowY: 'auto', 
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                  {clients.filter(c => `${c.name} ${c.lastName || ''}`.toLowerCase().includes(selectedClient.toLowerCase())).length > 0 ? (
                    clients.filter(c => `${c.name} ${c.lastName || ''}`.toLowerCase().includes(selectedClient.toLowerCase())).map(c => (
                      <div 
                        key={c.id}
                        style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(224, 248, 0, 0.1)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        onClick={() => {
                          setSelectedClient(`${c.name} ${c.lastName || ''}`.trim());
                          setShowClientDropdown(false);
                        }}
                      >
                        {c.name} {c.lastName || ''}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '10px 15px', color: 'var(--text-muted)' }}>No se encontraron clientes</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: '1 1 160px', minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Tipo de asignación</label>
            <select
              className="input-field"
              value={assignAs}
              onChange={(e) => setAssignAs(e.target.value)}
              style={{ width: '100%', marginBottom: 0, cursor: 'pointer' }}
            >
              <option value="current">💪 Rutina Actual</option>
              <option value="next">📅 Siguiente Rutina</option>
            </select>
          </div>
          
          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Nombre de la Rutina</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ej: Fuerza Bloque 1"
              value={periodStr}
              onChange={(e) => setPeriodStr(e.target.value)}
              style={{ width: '100%', marginBottom: 0 }}
            />
          </div>

          <div style={{ flex: '1 1 140px', minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Fecha Inicio</label>
            <input 
              type="date" 
              className="input-field" 
              value={routineStartDate} 
              onChange={(e) => {
                setRoutineStartDate(e.target.value);
                // Auto-adjust end date if it falls before start
                if (routineEndDate && e.target.value > routineEndDate) {
                  setRoutineEndDate(e.target.value);
                }
              }} 
              style={{ width: '100%', marginBottom: 0, colorScheme: 'dark' }}
              title="La rutina empieza este día"
            />
          </div>
          <div style={{ flex: '1 1 140px', minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Fecha Fin</label>
            <input 
              type="date" 
              className="input-field" 
              value={routineEndDate} 
              min={routineStartDate}
              onChange={(e) => setRoutineEndDate(e.target.value)} 
              style={{ width: '100%', marginBottom: 0, colorScheme: 'dark' }}
              title="La rutina termina este día"
            />
          </div>

          <div style={{ alignSelf: 'flex-end', paddingBottom: '2px' }}>
          {selectedClient && (
            <button 
              onClick={() => setShowTemplateModal(true)}
              style={{ background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '10px 20px', borderRadius: '6px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              📥 Cargar Plantilla Maestra
            </button>
          )}
          </div>
        </div>
      )}

      {!isTemplateMode && !selectedClient ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-light)' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '15px' }}>👤</span>
          <p style={{ color: 'var(--text-muted)' }}>Selecciona un cliente en el desplegable de arriba para empezar a planificar su rutina semanal.</p>
        </div>
      ) : (
        <>
      {/* Pestañas de Días de la Semana */}
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {DAYS_OF_WEEK.map(day => (
          <button 
            key={day}
            onClick={() => setActiveDay(day)}
            style={{ 
              background: activeDay === day ? 'var(--accent-primary)' : 'rgba(0,0,0,0.4)', 
              color: activeDay === day ? '#000' : 'var(--text-muted)',
              border: '1px solid var(--border-light)', 
              padding: '10px 16px', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              flex: 1,
              fontWeight: '600',
              transition: 'all 0.2s',
              position: 'relative'
            }}
          >
            {day}
            {weeklyRoutine[day].length > 0 && (
              <span style={{ 
                position: 'absolute', top: '-5px', right: '-5px', background: '#ff4500', color: 'white', 
                fontSize: '0.6rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' 
              }}>
                {weeklyRoutine[day].length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Constructor del Día Activo */}
      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h4 style={{ color: 'var(--accent-primary)', fontSize: '1.1rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Entrenamiento: {activeDay}</h4>
          <button type="button" className="no-print" onClick={() => addExercise(activeDay)} style={{ background: 'transparent', border: '1px dashed var(--accent-primary)', color: 'var(--accent-primary)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
            + Añadir Ejercicio
          </button>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <textarea 
            className="input-field" 
            placeholder="Añade recomendaciones o comentarios generales para este día (ej. céntrate en la fase excéntrica, calienta bien los rotadores...)" 
            value={dailyNotes[activeDay]} 
            onChange={(e) => setDailyNotes({...dailyNotes, [activeDay]: e.target.value})}
            style={{ minHeight: '80px', width: '100%', resize: 'vertical' }}
          />
        </div>

        {weeklyRoutine[activeDay].length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border-light)', borderRadius: '8px' }}>
            <p>Día de descanso.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '5px' }}>Añade ejercicios para hacer de este día una sesión activa.</p>
          </div>
        ) : (
          weeklyRoutine[activeDay].map((ex, index) => (
            <div key={index} style={{ background: 'rgba(20,20,24,0.8)', padding: '20px', borderRadius: '8px', marginBottom: '15px', borderLeft: ex.isOptional ? '3px solid #ffaa00' : '3px solid var(--accent-primary)', position: 'relative' }}>
              
              <div style={{ position: 'absolute', top: '10px', right: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input 
                  type="checkbox" 
                  id={`opt-${activeDay}-${index}`}
                  checked={ex.isOptional || false}
                  onChange={e => updateExercise(activeDay, index, 'isOptional', e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor={`opt-${activeDay}-${index}`} style={{ fontSize: '0.75rem', color: ex.isOptional ? '#ffaa00' : 'var(--text-muted)', cursor: 'pointer', fontWeight: '600', textTransform: 'uppercase' }}>Opcional</label>
              </div>

              <button 
                onClick={() => removeExercise(activeDay, index)} 
                style={{ position: 'absolute', top: '8px', right: '10px', background: 'transparent', border: 'none', color: '#ff4500', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}
                title="Eliminar ejercicio"
              >✕</button>
              
              {Array.isArray(ex.sets) && ex.sets.length > 0 ? (
                // Detailed per-set mode: each set has its own reps/intensity/notes so the
                // coach can prescribe e.g. 1x10 @8, 1x8 @9, 1x6 @9.5.
                <div style={{ marginTop: '15px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr', gap: '15px', marginBottom: '12px' }}>
                    <SearchableExerciseSelect value={ex.name} onChange={(val) => updateExercise(activeDay, index, 'name', val)} />
                    <input type="text" className="input-field" style={{ marginBottom: 0 }} placeholder={ex.suggestedWeight ? `Sugerido: ${ex.suggestedWeight} kg` : "Peso esp. (kg)"} value={ex.expectedWeight || ''} onChange={e => updateExercise(activeDay, index, 'expectedWeight', e.target.value)} />
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1.2fr 2fr 40px', gap: '10px', padding: '8px 12px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>Set</div><div>Reps</div><div>Intensidad</div><div>Nota</div><div></div>
                    </div>
                    {ex.sets.map((s, sIdx) => (
                      <div key={sIdx} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1.2fr 2fr 40px', gap: '10px', padding: '8px 12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold', textAlign: 'center' }}>{sIdx + 1}</div>
                        <input type="text" className="input-field" style={{ margin: 0 }} placeholder="10" value={s.reps} onChange={e => updateSet(activeDay, index, sIdx, 'reps', e.target.value)} />
                        <select className="input-field" style={{ margin: 0, cursor: 'pointer' }} value={s.intensity || ''} onChange={e => updateSet(activeDay, index, sIdx, 'intensity', e.target.value)}>
                          <option value="">—</option>
                          <option value="RIR 0">RIR 0</option>
                          <option value="RIR 1">RIR 1</option>
                          <option value="RIR 2">RIR 2</option>
                          <option value="RIR 3">RIR 3</option>
                          <option value="RPE 7">RPE 7</option>
                          <option value="RPE 8">RPE 8</option>
                          <option value="RPE 9">RPE 9</option>
                          <option value="RPE 10">RPE 10</option>
                          <option value="Al fallo">Al fallo</option>
                        </select>
                        <input type="text" className="input-field" style={{ margin: 0 }} placeholder="Nota de esta serie" value={s.notes || ''} onChange={e => updateSet(activeDay, index, sIdx, 'notes', e.target.value)} />
                        <button onClick={() => removeSet(activeDay, index, sIdx)} title="Eliminar serie" style={{ background: 'transparent', border: 'none', color: '#ff4500', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button onClick={() => addSet(activeDay, index)} style={{ background: 'rgba(224,248,0,0.1)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>+ Añadir serie</button>
                    <button onClick={() => disableDetailedSets(activeDay, index)} style={{ background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-muted)', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Volver a modo rápido</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 1.5fr 1.5fr', gap: '15px', marginBottom: '10px', marginTop: '15px' }}>
                    <SearchableExerciseSelect
                      value={ex.name}
                      onChange={(val) => updateExercise(activeDay, index, 'name', val)}
                    />
                    <input type="text" className="input-field" style={{ marginBottom: 0 }} placeholder="Series x Reps (4x10)" value={ex.reps} onChange={e => updateExercise(activeDay, index, 'reps', e.target.value)} />
                    <select
                      className="input-field"
                      style={{ marginBottom: 0, cursor: 'pointer' }}
                      value={ex.intensity}
                      onChange={e => updateExercise(activeDay, index, 'intensity', e.target.value)}
                    >
                      <option value="">Intensidad...</option>
                      <option value="RIR 0">RIR 0</option>
                      <option value="RIR 1">RIR 1</option>
                      <option value="RIR 2">RIR 2</option>
                      <option value="RIR 3">RIR 3</option>
                      <option value="RPE 7">RPE 7</option>
                      <option value="RPE 8">RPE 8</option>
                      <option value="RPE 9">RPE 9</option>
                      <option value="RPE 10">RPE 10</option>
                      <option value="Al fallo">Al fallo</option>
                    </select>
                    <input
                      type="text"
                      className="input-field"
                      style={{ marginBottom: 0 }}
                      placeholder={ex.suggestedWeight ? `Sugerido: ${ex.suggestedWeight} kg` : "Peso esp. (kg)"}
                      value={ex.expectedWeight || ''}
                      onChange={e => updateExercise(activeDay, index, 'expectedWeight', e.target.value)}
                    />
                  </div>
                  <button onClick={() => enableDetailedSets(activeDay, index)} style={{ marginTop: '8px', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--accent-primary)', color: 'var(--accent-primary)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    🎯 Definir series diferentes (ej. 10/8/6)
                  </button>
                </>
              )}
              <input type="text" className="input-field" style={{ marginBottom: 0, marginTop: '12px', width: '100%' }} placeholder="Notas técnicas para el cliente (ej. Baja lento en 3 segundos)" value={ex.notes} onChange={e => updateExercise(activeDay, index, 'notes', e.target.value)} />
            </div>
          ))
        )}
      </div>

      <div className="no-print" style={{ display: 'flex', gap: '15px', marginTop: '30px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
        <button type="button" onClick={() => window.print()} style={{ flex: 1, background: '#fff', color: '#000', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', transition: 'all 0.3s' }}>
          🖨️ Exportar a PDF
        </button>
        <button type="button" onClick={exportToExcel} style={{ flex: 1, background: '#107c41', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', transition: 'all 0.3s' }}>
          📊 Exportar a Excel (CSV)
        </button>
        <button type="button" className="btn-primary" style={{ flex: 2 }} onClick={async () => {
          if (isTemplateMode) {
            if (!templateTitle.trim()) {
              await dialog.alert("Por favor, introduce un título para la plantilla.", { title: "Falta título" });
              return;
            }
            const token = localStorage.getItem('token');
            const payloadRoutine = {};
            DAYS_OF_WEEK.forEach(day => {
              payloadRoutine[day] = weeklyRoutine[day] || [];
              payloadRoutine[`${day}_notes`] = dailyNotes[day] || '';
            });
            const routineStr = JSON.stringify(payloadRoutine);
            try {
              const url = editingTemplate 
                ? `${API_BASE_URL}/api/templates/${editingTemplate.id}` 
                : `${API_BASE_URL}/api/templates`;
              const method = editingTemplate ? 'PUT' : 'POST';
              const response = await fetch(url, {
                method: method,
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  title: templateTitle,
                  description: templateDescription,
                  routineJson: routineStr
                })
              });
              if (response.ok) {
                const saved = await response.json();
                const savedWithRoutine = {
                  ...saved,
                  routine: saved.routineJson ? (typeof saved.routineJson === 'string' ? JSON.parse(saved.routineJson) : saved.routineJson) : null
                };
                if (setTemplates) {
                  setTemplates(prev => {
                    if (editingTemplate) {
                      return prev.map(t => t.id === saved.id ? savedWithRoutine : t);
                    } else {
                      return [...prev, savedWithRoutine];
                    }
                  });
                }
                dialog.toast(editingTemplate ? "Plantilla actualizada con éxito." : "Plantilla maestra guardada con éxito.", { variant: 'success' });
                if (setActiveTab) setActiveTab('plantillas');
              } else {
                const errText = await response.text();
                await dialog.alert("Error al guardar la plantilla: " + errText, { title: "Error" });
              }
            // eslint-disable-next-line no-unused-vars
            } catch (err) {
              await dialog.alert("Error de red al guardar la plantilla.", { title: "Error de red" });
            }
          } else {
            if (!selectedClient) {
              await dialog.alert("Por favor, selecciona un cliente primero.", { title: "Faltan datos" });
              return;
            }
            const clientObj = clients.find(c => `${c.name} ${c.lastName || ''}`.trim() === selectedClient);
            if (!clientObj) {
              await dialog.alert("Cliente no encontrado.", { title: "Error" });
              return;
            }
            const token = localStorage.getItem('token');
            const payloadRoutine = {};
            DAYS_OF_WEEK.forEach(day => {
              payloadRoutine[day] = weeklyRoutine[day] || [];
              payloadRoutine[`${day}_notes`] = dailyNotes[day] || '';
            });
            const routineStr = JSON.stringify(payloadRoutine);

            // Validate date range
            if (routineStartDate && routineEndDate && routineEndDate < routineStartDate) {
              dialog.toast('La fecha de fin no puede ser anterior a la fecha de inicio.', { variant: 'error' });
              return;
            }

            try {
              const bodyPayload = assignAs === 'next' 
                ? { nextRoutineJson: routineStr }
                : { routineJson: routineStr, routineStartDate: routineStartDate || null, routineEndDate: routineEndDate || null };

              const response = await fetch(`${API_BASE_URL}/api/users/clients/${clientObj.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bodyPayload)
              });
              if (response.ok) {
                const updatedClientData = await response.json();
                if (setClients) {
                  setClients(prev => prev.map(c => 
                    c.id === clientObj.id ? { 
                      ...c, 
                      hasRoutine: !!(updatedClientData.routineJson),
                      routineJson: updatedClientData.routineJson,
                      routine: updatedClientData.routineJson ? JSON.parse(updatedClientData.routineJson) : null,
                      nextRoutineJson: updatedClientData.nextRoutineJson,
                      nextRoutine: updatedClientData.nextRoutineJson ? JSON.parse(updatedClientData.nextRoutineJson) : null,
                      routineUpdatedAt: updatedClientData.routineUpdatedAt
                    } : c
                  ));
                }
                dialog.toast(
                  assignAs === 'next' 
                    ? `Siguiente rutina programada con éxito para ${selectedClient}.`
                    : `Rutina asignada con éxito a ${selectedClient}.`, 
                  { variant: 'success' }
                );
              } else {
                await dialog.alert("Error al guardar la rutina en el servidor.", { title: "Error" });
              }
            // eslint-disable-next-line no-unused-vars
            } catch (err) {
              await dialog.alert("Error de red al guardar la rutina.", { title: "Error" });
            }
          }
        }}>
          {isTemplateMode ? '💾 Guardar Plantilla Maestra' : '💾 Guardar Rutina'}
        </button>
      </div>

      </>
      )}

      {/* Modal Cargar Plantilla */}
      {showTemplateModal && createPortal(
        <div className="fade-in" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)',
          zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', background: 'rgba(20, 20, 24, 0.98)', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)' }}>Mis Plantillas</h3>
              <button onClick={() => setShowTemplateModal(false)} style={{ background: 'transparent', border: 'none', color: '#ff4500', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Selecciona una plantilla para cargarla en el planificador.
            </p>
 
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {templates.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => {
                    const { exercises, notes } = parseRoutineJson(t.routineJson || t.routine);
                    setWeeklyRoutine(exercises);
                    setDailyNotes(notes);
                    dialog.toast(`Plantilla "${t.title}" cargada.`, { variant: 'success' });
                    setShowTemplateModal(false);
                  }}
                  style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', cursor: 'pointer', border: '1px solid transparent', transition: 'border 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.border = '1px solid var(--accent-primary)'}
                  onMouseOut={(e) => e.currentTarget.style.border = '1px solid transparent'}
                >
                  <p style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{t.title}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>{t.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
