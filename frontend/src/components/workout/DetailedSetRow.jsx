import React from 'react';

const DetailedSetRow = React.memo(({ day, exIndex, setIndex, set, updateSet, removeSet }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1.2fr 2fr 40px', gap: '10px', padding: '8px 12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold', textAlign: 'center' }}>{setIndex + 1}</div>
      <input 
        type="text" 
        className="input-field" 
        style={{ margin: 0 }} 
        placeholder="10" 
        value={set.reps} 
        onChange={e => updateSet(day, exIndex, setIndex, 'reps', e.target.value)} 
      />
      <select 
        className="input-field" 
        style={{ margin: 0, cursor: 'pointer' }} 
        value={set.intensity || ''} 
        onChange={e => updateSet(day, exIndex, setIndex, 'intensity', e.target.value)}
      >
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
      <input 
        type="text" 
        className="input-field" 
        style={{ margin: 0 }} 
        placeholder="Nota de esta serie" 
        value={set.notes || ''} 
        onChange={e => updateSet(day, exIndex, setIndex, 'notes', e.target.value)} 
      />
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
