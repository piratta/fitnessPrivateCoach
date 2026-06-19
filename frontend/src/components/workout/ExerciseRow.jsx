import React, { useCallback } from 'react';
import SearchableExerciseSelect from '../SearchableExerciseSelect';
import DetailedSetRow from './DetailedSetRow';

const ExerciseRow = React.memo(({ 
  day, 
  index, 
  ex, 
  updateExercise, 
  removeExercise, 
  enableDetailedSets, 
  disableDetailedSets, 
  addSet, 
  updateSet, 
  removeSet 
}) => {
  // Use useCallback for simple field updates to avoid inline arrow functions in render
  const handleIsOptionalChange = useCallback((e) => {
    updateExercise(day, index, 'isOptional', e.target.checked);
  }, [day, index, updateExercise]);

  const handleNameChange = useCallback((val) => {
    updateExercise(day, index, 'name', val);
  }, [day, index, updateExercise]);

  const handleExpectedWeightChange = useCallback((e) => {
    updateExercise(day, index, 'expectedWeight', e.target.value);
  }, [day, index, updateExercise]);

  const handleRepsChange = useCallback((e) => {
    updateExercise(day, index, 'reps', e.target.value);
  }, [day, index, updateExercise]);

  const handleIntensityChange = useCallback((e) => {
    updateExercise(day, index, 'intensity', e.target.value);
  }, [day, index, updateExercise]);

  const handleNotesChange = useCallback((e) => {
    updateExercise(day, index, 'notes', e.target.value);
  }, [day, index, updateExercise]);

  const handleRemove = useCallback(() => {
    removeExercise(day, index);
  }, [day, index, removeExercise]);

  const handleEnableDetailedSets = useCallback(() => {
    enableDetailedSets(day, index);
  }, [day, index, enableDetailedSets]);

  const handleDisableDetailedSets = useCallback(() => {
    disableDetailedSets(day, index);
  }, [day, index, disableDetailedSets]);

  const handleAddSet = useCallback(() => {
    addSet(day, index);
  }, [day, index, addSet]);

  return (
    <div style={{ background: 'rgba(20,20,24,0.8)', padding: '20px', borderRadius: '8px', marginBottom: '15px', borderLeft: ex.isOptional ? '3px solid #ffaa00' : '3px solid var(--accent-primary)', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '10px', right: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input 
          type="checkbox" 
          id={`opt-${day}-${index}`}
          checked={ex.isOptional || false}
          onChange={handleIsOptionalChange}
          style={{ cursor: 'pointer' }}
        />
        <label htmlFor={`opt-${day}-${index}`} style={{ fontSize: '0.75rem', color: ex.isOptional ? '#ffaa00' : 'var(--text-muted)', cursor: 'pointer', fontWeight: '600', textTransform: 'uppercase' }}>
          Opcional
        </label>
      </div>

      <button 
        onClick={handleRemove} 
        style={{ position: 'absolute', top: '8px', right: '10px', background: 'transparent', border: 'none', color: '#ff4500', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}
        title="Eliminar ejercicio"
      >
        ✕
      </button>
      
      {Array.isArray(ex.sets) && ex.sets.length > 0 ? (
        <div style={{ marginTop: '15px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr', gap: '15px', marginBottom: '12px' }}>
            <SearchableExerciseSelect value={ex.name} onChange={handleNameChange} />
            <input 
              type="text" 
              className="input-field" 
              style={{ marginBottom: 0 }} 
              placeholder={ex.suggestedWeight ? `Sugerido: ${ex.suggestedWeight} kg` : "Peso esp. (kg)"} 
              value={ex.expectedWeight || ''} 
              onChange={handleExpectedWeightChange} 
            />
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1.2fr 2fr 40px', gap: '10px', padding: '8px 12px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>Set</div><div>Reps</div><div>Intensidad</div><div>Nota</div><div></div>
            </div>
            {ex.sets.map((s, sIdx) => (
              <DetailedSetRow 
                key={sIdx}
                day={day}
                exIndex={index}
                setIndex={sIdx}
                set={s}
                updateSet={updateSet}
                removeSet={removeSet}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button onClick={handleAddSet} style={{ background: 'rgba(224,248,0,0.1)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>
              + Añadir serie
            </button>
            <button onClick={handleDisableDetailedSets} style={{ background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-muted)', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
              Volver a modo rápido
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 1.5fr 1.5fr', gap: '15px', marginBottom: '10px', marginTop: '15px' }}>
            <SearchableExerciseSelect
              value={ex.name}
              onChange={handleNameChange}
            />
            <input 
              type="text" 
              className="input-field" 
              style={{ marginBottom: 0 }} 
              placeholder="Series x Reps (4x10)" 
              value={ex.reps} 
              onChange={handleRepsChange} 
            />
            <select
              className="input-field"
              style={{ marginBottom: 0, cursor: 'pointer' }}
              value={ex.intensity}
              onChange={handleIntensityChange}
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
              onChange={handleExpectedWeightChange}
            />
          </div>
          <button onClick={handleEnableDetailedSets} style={{ marginTop: '8px', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--accent-primary)', color: 'var(--accent-primary)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
            🎯 Definir series diferentes (ej. 10/8/6)
          </button>
        </>
      )}
      <input 
        type="text" 
        className="input-field" 
        style={{ marginBottom: 0, marginTop: '12px', width: '100%' }} 
        placeholder="Notas técnicas para el cliente (ej. Baja lento en 3 segundos)" 
        value={ex.notes} 
        onChange={handleNotesChange} 
      />
    </div>
  );
});

export default ExerciseRow;
