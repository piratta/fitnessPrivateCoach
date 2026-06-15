import React, { useState } from 'react';
import '../index.css';

export default function TemplateManager({ templates, setTemplates, onCreateNew, onEditTemplate }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = templates.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="glass-panel" style={{ padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem' }}>Mis Plantillas Predeterminadas</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>Crea rutinas maestras y asígnalas rápidamente a tus clientes.</p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="🔍 Buscar plantilla..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: '0', width: '250px' }}
          />
          <button 
            onClick={onCreateNew}
            style={{ background: 'var(--accent-primary)', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>+</span> Nueva Plantilla
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filteredTemplates.map(template => (
          <div key={template.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ color: 'var(--accent-primary)', marginBottom: '10px', fontSize: '1.1rem' }}>{template.title}</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', flex: 1, marginBottom: '20px' }}>{template.description}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn-primary" 
                style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                onClick={() => onEditTemplate(template)}
              >
                ✏️ Editar Plantilla
              </button>
              <button style={{ background: 'transparent', border: '1px solid #ff4500', color: '#ff4500', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }} title="Eliminar">🗑️</button>
            </div>
          </div>
        ))}
        {filteredTemplates.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No se encontraron plantillas.
          </div>
        )}
      </div>
    </div>
  );
}
