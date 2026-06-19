import React from 'react';
import { createPortal } from 'react-dom';
import { useWorkoutBuilder, parseRoutineJson } from '../hooks/useWorkoutBuilder';
import ExerciseRow from './workout/ExerciseRow';
import '../index.css';

export default function WorkoutBuilder({ clients = [], templates = [], isTemplateMode = false, editingTemplate = null, initialClient = '', setClients, setTemplates, setActiveTab }) {
  const builder = useWorkoutBuilder({
    clients, templates, isTemplateMode, editingTemplate, initialClient, setClients, setTemplates, setActiveTab
  });

  return (
    <div className="glass-panel" style={{ padding: '30px' }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>Planificador Semanal de Rutinas</h3>
      
      {isTemplateMode ? (
        <div className="responsive-flex" style={{ marginBottom: '30px', display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Nombre de la Plantilla</label>
            <input type="text" className="input-field" placeholder="Ej. Hipertrofia 4 Días" value={builder.templateTitle} onChange={e => builder.setTemplateTitle(e.target.value)} />
          </div>
          <div style={{ flex: '2 1 280px', minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Descripción Breve</label>
            <input type="text" className="input-field" placeholder="Ej. Frecuencia 2 Torso/Pierna con énfasis en brazos" value={builder.templateDescription} onChange={e => builder.setTemplateDescription(e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="responsive-flex" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '30px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Cliente a asignar</label>
            <div style={{ position: 'relative' }} ref={builder.dropdownRef}>
              <input 
                className="input-field" 
                placeholder="Escribe el nombre del cliente..." 
                value={builder.selectedClient} 
                onChange={(e) => {
                  builder.setSelectedClient(e.target.value);
                  builder.setShowClientDropdown(true);
                }}
                onFocus={() => builder.setShowClientDropdown(true)}
                style={{ cursor: 'text', width: '100%', marginBottom: 0 }}
              />
              {builder.showClientDropdown && (
                <div style={{ 
                  position: 'absolute', top: '100%', left: 0, right: 0, 
                  background: 'var(--bg-panel)', border: '1px solid var(--border-light)', 
                  borderRadius: '6px', marginTop: '5px', maxHeight: '200px', overflowY: 'auto', 
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                  {clients.filter(c => `${c.name} ${c.lastName || ''}`.toLowerCase().includes(builder.selectedClient.toLowerCase())).length > 0 ? (
                    clients.filter(c => `${c.name} ${c.lastName || ''}`.toLowerCase().includes(builder.selectedClient.toLowerCase())).map(c => (
                      <div 
                        key={c.id}
                        style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(224, 248, 0, 0.1)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        onClick={() => {
                          builder.setSelectedClient(`${c.name} ${c.lastName || ''}`.trim());
                          builder.setShowClientDropdown(false);
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
              value={builder.assignAs}
              onChange={(e) => builder.setAssignAs(e.target.value)}
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
              value={builder.periodStr}
              onChange={(e) => builder.setPeriodStr(e.target.value)}
              style={{ width: '100%', marginBottom: 0 }}
            />
          </div>

          <div style={{ flex: '1 1 140px', minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Fecha Inicio</label>
            <input 
              type="date" 
              className="input-field" 
              value={builder.routineStartDate} 
              onChange={(e) => {
                builder.setRoutineStartDate(e.target.value);
                if (builder.routineEndDate && e.target.value > builder.routineEndDate) {
                  builder.setRoutineEndDate(e.target.value);
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
              value={builder.routineEndDate} 
              min={builder.routineStartDate}
              onChange={(e) => builder.setRoutineEndDate(e.target.value)} 
              style={{ width: '100%', marginBottom: 0, colorScheme: 'dark' }}
              title="La rutina termina este día"
            />
          </div>

          <div style={{ alignSelf: 'flex-end', paddingBottom: '2px' }}>
          {builder.selectedClient && (
            <button 
              onClick={() => builder.setShowTemplateModal(true)}
              style={{ background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '10px 20px', borderRadius: '6px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              📥 Cargar Plantilla Maestra
            </button>
          )}
          </div>
        </div>
      )}

      {!isTemplateMode && !builder.selectedClient ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-light)' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '15px' }}>👤</span>
          <p style={{ color: 'var(--text-muted)' }}>Selecciona un cliente en el desplegable de arriba para empezar a planificar su rutina semanal.</p>
        </div>
      ) : (
        <>
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {builder.DAYS_OF_WEEK.map(day => (
          <button 
            key={day}
            onClick={() => builder.setActiveDay(day)}
            style={{ 
              background: builder.activeDay === day ? 'var(--accent-primary)' : 'rgba(0,0,0,0.4)', 
              color: builder.activeDay === day ? '#000' : 'var(--text-muted)',
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
            {builder.weeklyRoutine[day].length > 0 && (
              <span style={{ 
                position: 'absolute', top: '-5px', right: '-5px', background: '#ff4500', color: 'white', 
                fontSize: '0.6rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' 
              }}>
                {builder.weeklyRoutine[day].length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h4 style={{ color: 'var(--accent-primary)', fontSize: '1.1rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Entrenamiento: {builder.activeDay}</h4>
          <button type="button" className="no-print" onClick={() => builder.addExercise(builder.activeDay)} style={{ background: 'transparent', border: '1px dashed var(--accent-primary)', color: 'var(--accent-primary)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
            + Añadir Ejercicio
          </button>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <textarea 
            className="input-field" 
            placeholder="Añade recomendaciones o comentarios generales para este día (ej. céntrate en la fase excéntrica, calienta bien los rotadores...)" 
            value={builder.dailyNotes[builder.activeDay]} 
            onChange={(e) => builder.updateDailyNotes(builder.activeDay, e.target.value)}
            style={{ minHeight: '80px', width: '100%', resize: 'vertical' }}
          />
        </div>

        {builder.weeklyRoutine[builder.activeDay].length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border-light)', borderRadius: '8px' }}>
            <p>Día de descanso.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '5px' }}>Añade ejercicios para hacer de este día una sesión activa.</p>
          </div>
        ) : (
          builder.weeklyRoutine[builder.activeDay].map((ex, index) => (
            <ExerciseRow 
              key={index} 
              day={builder.activeDay} 
              index={index} 
              ex={ex} 
              updateExercise={builder.updateExercise} 
              removeExercise={builder.removeExercise} 
              enableDetailedSets={builder.enableDetailedSets} 
              disableDetailedSets={builder.disableDetailedSets} 
              addSet={builder.addSet} 
              updateSet={builder.updateSet} 
              removeSet={builder.removeSet} 
            />
          ))
        )}
      </div>

      <div className="no-print" style={{ display: 'flex', gap: '15px', marginTop: '30px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
        <button type="button" onClick={() => window.print()} style={{ flex: 1, background: '#fff', color: '#000', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', transition: 'all 0.3s' }}>
          🖨️ Exportar a PDF
        </button>
        <button type="button" onClick={builder.exportToExcel} style={{ flex: 1, background: '#107c41', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', transition: 'all 0.3s' }}>
          📊 Exportar a Excel (CSV)
        </button>
        <button type="button" className="btn-primary" style={{ flex: 2 }} onClick={builder.saveRoutine}>
          {isTemplateMode ? '💾 Guardar Plantilla Maestra' : '💾 Guardar Rutina'}
        </button>
      </div>
      </>
      )}

      {builder.showTemplateModal && createPortal(
        <div className="fade-in" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)',
          zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', background: 'rgba(20, 20, 24, 0.98)', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)' }}>Mis Plantillas</h3>
              <button onClick={() => builder.setShowTemplateModal(false)} style={{ background: 'transparent', border: 'none', color: '#ff4500', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Selecciona una plantilla para cargarla en el planificador.
            </p>
 
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {templates.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => builder.loadTemplate(t)}
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
