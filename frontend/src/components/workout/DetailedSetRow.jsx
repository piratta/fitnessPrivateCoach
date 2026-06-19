import React from 'react';

const DetailedSetRow = React.memo(({ day, exIndex, setIndex, set, updateSet, removeSet }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 1.5fr 40px', gap: '8px', padding: '8px 12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold', textAlign: 'center' }}>{setIndex + 1}</div>

      {/* Repeticiones */}
      <input
        type="text"
        className="input-field"
        style={{ margin: 0 }}
        placeholder="Reps"
        value={set.reps || ''}
        onChange={e => updateSet(day, exIndex, setIndex, 'reps', e.target.value)}
      />

      {/* RIR (Número entero) */}
      <input
        type="number"
        min="0"
        className="input-field"
        style={{ margin: 0 }}
        placeholder="RIR"
        value={set.rir || ''}
        onChange={e => updateSet(day, exIndex, setIndex, 'rir', parseInt(e.target.value))}
      />

      {/* Tempo (String) */}
      <input
        type="text"
        className="input-field"
        style={{ margin: 0 }}
        placeholder="Tempo (ej. 3010)"
        value={set.tempo || ''}
        onChange={e => updateSet(day, exIndex, setIndex, 'tempo', e.target.value)}
      />

      {/* Notas */}
      <input
        type="text"
        className="input-field"
        style={{ margin: 0 }}
        placeholder="Nota de esta serie"
        value={set.notes || ''}
        onChange={e => updateSet(day, exIndex, setIndex, 'notes', e.target.value)}
      />

      {/* Eliminar */}
      <button
        onClick={() => removeSet(day, exIndex, setIndex)}
        title="Eliminar serie"
        style={{ background: 'transparent', border: 'none', color: '#ff4500', cursor: 'pointer', fontSize: '1.1rem' }}
      >
        ✕
      </button>
    </div>
  );
});

export default DetailedSetRow;