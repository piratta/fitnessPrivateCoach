import { useState } from 'react';
import '../index.css';

export default function InitialQuestionnaire({ onComplete }) {
  const [formData, setFormData] = useState({
    peso: '',
    altura: '',
    edad: '',
    cuello: '',
    cintura: '',
    cadera: '',
    biceps: '',
    pierna: '',
    sueno: '7',
    estres: 'Bajo',
    digestiones: 'Buenas'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete(formData);
  };

  return (
    <div className="fade-in" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '40px', borderTop: '4px solid var(--accent-primary)' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '10px' }}>Bienvenido a tu nueva etapa 💪</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
          Para poder personalizar tu experiencia y medir tu progreso, necesitamos que completes este cuestionario inicial con sinceridad. Estos datos son confidenciales y solo tu entrenador tendrá acceso a ellos.
        </p>

        <form onSubmit={handleSubmit}>
          <h4 style={{ color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Biometría Básica</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Peso (kg)</label>
              <input type="number" step="0.1" required className="input-field" value={formData.peso} onChange={e => setFormData({...formData, peso: e.target.value})} placeholder="Ej. 75.5" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Altura (cm)</label>
              <input type="number" required className="input-field" value={formData.altura} onChange={e => setFormData({...formData, altura: e.target.value})} placeholder="Ej. 178" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Edad</label>
              <input type="number" required className="input-field" value={formData.edad} onChange={e => setFormData({...formData, edad: e.target.value})} placeholder="Ej. 28" />
            </div>
          </div>

          <h4 style={{ color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Medidas Corporales (cm)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Cintura</label>
              <input type="number" step="0.5" className="input-field" value={formData.cintura} onChange={e => setFormData({...formData, cintura: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Cadera</label>
              <input type="number" step="0.5" className="input-field" value={formData.cadera} onChange={e => setFormData({...formData, cadera: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Cuello</label>
              <input type="number" step="0.5" className="input-field" value={formData.cuello} onChange={e => setFormData({...formData, cuello: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Bíceps</label>
              <input type="number" step="0.5" className="input-field" value={formData.biceps} onChange={e => setFormData({...formData, biceps: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>Pierna</label>
              <input type="number" step="0.5" className="input-field" value={formData.pierna} onChange={e => setFormData({...formData, pierna: e.target.value})} />
            </div>
          </div>

          <h4 style={{ color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Contexto y Recuperación</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '40px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>¿Cuántas horas sueles dormir de media?</label>
              <select className="input-field" value={formData.sueno} onChange={e => setFormData({...formData, sueno: e.target.value})}>
                <option value="Menos de 6">Menos de 6 horas</option>
                <option value="6-7">Entre 6 y 7 horas</option>
                <option value="7-8">Entre 7 y 8 horas</option>
                <option value="Mas de 8">Más de 8 horas</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>¿Cómo evalúas tu nivel de estrés diario actual?</label>
              <select className="input-field" value={formData.estres} onChange={e => setFormData({...formData, estres: e.target.value})}>
                <option value="Bajo">Bajo (Tranquilo)</option>
                <option value="Moderado">Moderado (Normal)</option>
                <option value="Alto">Alto (Mucha presión)</option>
                <option value="Extremo">Extremo (Ansiedad constante)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>¿Cómo son tus digestiones habitualmente?</label>
              <select className="input-field" value={formData.digestiones} onChange={e => setFormData({...formData, digestiones: e.target.value})}>
                <option value="Muy Buenas">Muy Buenas (Sin pesadez nunca)</option>
                <option value="Buenas">Buenas (Normales)</option>
                <option value="Regulares">Regulares (A veces pesadez o gases)</option>
                <option value="Malas">Malas (Hinchazón constante, reflujo)</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ padding: '16px', fontSize: '1.1rem' }}>
            Guardar Cuestionario y Ver Mi Rutina 🚀
          </button>
        </form>
      </div>
    </div>
  );
}
