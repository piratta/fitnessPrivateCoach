import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import SearchableExerciseSelect from './SearchableExerciseSelect';
import '../index.css';

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function WorkoutBuilder({ clients = [], templates = [], isTemplateMode = false, editingTemplate = null, initialClient = '', setClients }) {
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateTitle, setTemplateTitle] = useState(editingTemplate ? editingTemplate.title : '');
  const [templateDescription, setTemplateDescription] = useState(editingTemplate ? editingTemplate.description : '');
  const [periodStr, setPeriodStr] = useState('');
  const [routineStartDate, setRoutineStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const dropdownRef = useRef(null);

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
    if (editingTemplate && editingTemplate.routine) return editingTemplate.routine;
    return {
      Lunes: [],
      Martes: [],
      Miércoles: [],
      Jueves: [],
      Viernes: [],
      Sábado: [],
      Domingo: []
    };
  });

  const [activeDay, setActiveDay] = useState('Lunes');
  const [selectedClient, setSelectedClient] = useState(initialClient);
  const [dailyNotes, setDailyNotes] = useState({
    Lunes: '', Martes: '', Miércoles: '', Jueves: '', Viernes: '', Sábado: '', Domingo: ''
  });

  useEffect(() => {
    if (!isTemplateMode && selectedClient) {
      const clientObj = clients.find(c => c.name === selectedClient);
      if (clientObj && clientObj.routine) {
        setWeeklyRoutine(JSON.parse(JSON.stringify(clientObj.routine)));
      } else {
        setWeeklyRoutine({
          Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []
        });
      }
    }
  }, [selectedClient, clients, isTemplateMode]);

  const addExercise = (day) => {
    setWeeklyRoutine({
      ...weeklyRoutine,
      [day]: [...weeklyRoutine[day], { name: '', reps: '', intensity: '', notes: '', isOptional: false }]
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
        <div style={{ marginBottom: '30px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Nombre de la Plantilla</label>
            <input type="text" className="input-field" placeholder="Ej. Hipertrofia 4 Días" value={templateTitle} onChange={e => setTemplateTitle(e.target.value)} />
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Descripción Breve</label>
            <input type="text" className="input-field" placeholder="Ej. Frecuencia 2 Torso/Pierna con énfasis en brazos" value={templateDescription} onChange={e => setTemplateDescription(e.target.value)} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '30px' }}>
          <div style={{ flex: 1 }}>
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
                  {clients.filter(c => c.name.toLowerCase().includes(selectedClient.toLowerCase())).length > 0 ? (
                    clients.filter(c => c.name.toLowerCase().includes(selectedClient.toLowerCase())).map(c => (
                      <div 
                        key={c.id}
                        style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(224, 248, 0, 0.1)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        onClick={() => {
                          setSelectedClient(c.name);
                          setShowClientDropdown(false);
                        }}
                      >
                        {c.name}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '10px 15px', color: 'var(--text-muted)' }}>No se encontraron clientes</div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div style={{ flex: 1 }}>
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

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Inicio (Activación)</label>
            <input 
              type="date" 
              className="input-field" 
              value={routineStartDate} 
              onChange={(e) => setRoutineStartDate(e.target.value)} 
              style={{ width: '100%', marginBottom: 0, colorScheme: 'dark' }}
              title="La rutina reemplazará a la actual automáticamente este día"
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
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', marginBottom: '10px', marginTop: '15px' }}>
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
              </div>
              <input type="text" className="input-field" style={{ marginBottom: 0, width: '100%' }} placeholder="Notas técnicas para el cliente (ej. Baja lento en 3 segundos)" value={ex.notes} onChange={e => updateExercise(activeDay, index, 'notes', e.target.value)} />
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
        <button type="button" className="btn-primary" style={{ flex: 2 }} onClick={() => {
          if (isTemplateMode) {
            alert("Plantilla maestra guardada con éxito.");
          } else {
            if (!selectedClient) {
              alert("Por favor, selecciona un cliente primero.");
              return;
            }
            if (setClients) {
              setClients(prev => prev.map(c => 
                c.name === selectedClient ? { ...c, hasRoutine: true, routine: JSON.parse(JSON.stringify(weeklyRoutine)) } : c
              ));
            }
            alert(`Rutina asignada y guardada con éxito para ${selectedClient}.`);
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
                    const fallbackRoutine = { Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: [] };
                    setWeeklyRoutine(t.routine ? JSON.parse(JSON.stringify(t.routine)) : fallbackRoutine);
                    alert(`Plantilla "${t.title}" cargada en el planificador.`);
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
